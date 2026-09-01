# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The Node Mount Gateway contract: what a grant is, and where it is written.

A Pod's volumes are fixed when it is created, so a launch that mounts content
cannot be served from the prewarmed pool by adding a volume. Every pooled pod
instead carries one memory-backed `emptyDir` that the runtime container mounts
`HostToContainer`, and a privileged node agent binds real filesystems into it
after the pod is running.

The Operator grants a mount by writing this module's payload to the pod's
`gateway-mounts` annotation; the node agent watches pods on its node, applies
what the annotation asks for, and answers on `gateway-mounts-ready`. There is
no gateway API to authenticate and no port reachable from inside the tenant
pod: the Kubernetes API is the whole interface, and authorization is RBAC on
patching a runtime pod.

It lives in `datalayer_core` because three separate distributions read and
write it: the Operator and the companion through `datalayer_common`, and the
node agent through `clouder`. It was briefly copied into the agent and held to
this original by a test, which worked and was the wrong shape — a format two
processes must agree on byte for byte should be one implementation, not two
kept in step. The only thing this may import is the standard library, so that
staying shared costs nothing.

@module datalayer_core.contents_node_mount_gateway
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any, Iterable

logger = logging.getLogger(__name__)

#: The Pod annotation the Operator writes: the mount set a runtime is granted.
NODE_MOUNT_GATEWAY_MOUNTS_ANNOTATION = "runtime-pools.datalayer.io/node-mount-gateway-mounts"

#: The Pod annotation the node agent writes back: what it actually mounted.
NODE_MOUNT_GATEWAY_READY_ANNOTATION = "runtime-pools.datalayer.io/node-mount-gateway-ready"

#: The Pod label that says this Pod carries the gateway volume. A pool built
#: before the gateway shipped still holds Pods without it, and one of those
#: must never be handed to a launch that needs a hot attach.
NODE_MOUNT_GATEWAY_POD_LABEL = "runtime-pools.datalayer.io/node-mount-gateway"

#: The gateway volume, and where each container sees it.
NODE_MOUNT_GATEWAY_VOLUME_NAME = "node-mount-gateway"
NODE_MOUNT_GATEWAY_MOUNT_PATH = "/mnt/datalayer"

#: Where a granted folder is reached in the sandbox: the path a creation-time
#: mount already uses, joined to the gateway by a symlink the companion makes
#: inside the sandbox. It is deliberately NOT a volume — a home directory
#: moved onto one is not in `rootfs-diff.tar`, which is what a CRIU checkpoint
#: captures, so a restored sandbox would come back with an empty home.
RUNTIME_HOME_MOUNT_PATH = "/home/jovyan"

#: The gateway holds mount points and nothing else — a byte written into the
#: tmpfs is a byte of the Pod's memory — so its size limit is small on purpose.
NODE_MOUNT_GATEWAY_SIZE_LIMIT = "1Mi"

# --- Kinds, and how each one is delivered -----------------------------------
#
# A kind says what a mount *is*; a delivery says what the node agent has to do
# to produce it. Several kinds share a delivery, and the agent dispatches on
# the delivery, so adding a kind that mounts like an existing one is a line in
# the table below. This is deliberate: the gateway replaces a creation-time
# path that already serves three unrelated things — a Git checkout, an NFS
# export and an S3 bucket — and a gateway that could only do buckets would
# replace a third of it.

#: A folder on the shared filesystem, provisioned lazily: it exists the first
#: time a sandbox mounts it or something is uploaded into it, whichever comes
#: first. Mounting is one of the two, so the agent is one of the two creators.
FILES_KIND = "files"

#: A folder on the shared filesystem that is *not* provisioned: a dataset an
#: administrator put there, mounted by sub-path. This is what a `RuntimeContent`
#: of `type: nfs` is today, where the export is already the shared claim.
SHARED_FOLDER_KIND = "shared-folder"

#: An NFS export the node mounts itself — a share this cluster can reach that
#: is *not* the shared claim. No process, nothing to watch: the kernel holds
#: it, and it goes away when it is unmounted.
NFS_KIND = "nfs"

#: A Git repository at a pinned revision. Nothing can bind a URL, so the agent
#: checks it out on the node first and binds the checkout — the one kind whose
#: mount has to be produced before it can be made.
GIT_KIND = "git"

#: The grant kind of a local bridge: a person's own folder, served by a
#: process on the node rather than bound from the shared claim.
LOCAL_BRIDGE_KIND = "local-bridge"

#: The grant kind of a mounted bucket, served the same way — and the one whose
#: credential expires, so the Secret it names is re-minted before it does.
CLOUD_STORAGE_KIND = "cloud-storage"

#: Bind a directory the agent already reaches beneath the shared filesystem.
DELIVERY_BIND = "bind"

#: Mount a filesystem the kernel knows how to mount. Nothing runs afterwards.
DELIVERY_FILESYSTEM = "filesystem"

#: Run a userspace filesystem. Something stays alive for the mount to answer,
#: so it is started, watched, and its death is a mount that returns errors
#: rather than one that disappears.
DELIVERY_PROCESS = "process"

#: Produce the content on the node, then bind what was produced.
DELIVERY_MATERIALIZE = "materialize"

#: Every kind the gateway serves, and how. A kind absent from this table is
#: refused where the grant is written rather than on a node.
KIND_DELIVERIES = {
    FILES_KIND: DELIVERY_BIND,
    SHARED_FOLDER_KIND: DELIVERY_BIND,
    NFS_KIND: DELIVERY_FILESYSTEM,
    GIT_KIND: DELIVERY_MATERIALIZE,
    LOCAL_BRIDGE_KIND: DELIVERY_PROCESS,
    CLOUD_STORAGE_KIND: DELIVERY_PROCESS,
}

#: States the node agent reports.
STATE_READY = "ready"
STATE_DEGRADED = "degraded"
STATE_FAILED = "failed"

#: Why a grant was refused or could not be applied.
ERROR_INVALID_TARGET = "NODE_MOUNT_GATEWAY_INVALID_TARGET"
#: The grant named a Secret the node agent may not read, or that is not there.
ERROR_SECRET_REFUSED = "NODE_MOUNT_GATEWAY_SECRET_REFUSED"
ERROR_INVALID_SOURCE = "NODE_MOUNT_GATEWAY_INVALID_SOURCE"
ERROR_TOO_MANY_MOUNTS = "NODE_MOUNT_GATEWAY_TOO_MANY_MOUNTS"
ERROR_MOUNT_FAILED = "NODE_MOUNT_GATEWAY_MOUNT_FAILED"
ERROR_NOT_READY = "NODE_MOUNT_GATEWAY_NOT_READY"
ERROR_UNSUPPORTED_KIND = "NODE_MOUNT_GATEWAY_UNSUPPORTED_KIND"

MODES = ("ro", "rw")

#: One path segment, and one that cannot be read as anything else: no `/`, no
#: `.` or `..`, nothing starting with a dash that an argument parser could take
#: for a flag. The character set is `sanitize_mount_handle`'s, because a home
#: folder's name comes from there and a name it produces must not be a name
#: this refuses.
_TARGET_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._-]{0,126}$")


class NodeMountGatewayError(ValueError):
    """A grant that must not be applied, with the code to report."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def delivery_of(kind: Any) -> str:
    """How the node agent produces a mount of this kind, or raise.

    A grant that names no kind is a plain bind, which is what every grant was
    before there were kinds; a grant that names one nobody serves is refused
    here, where it is written, rather than on a node that would have to guess.
    """
    name = str(kind or "")
    if not name:
        return DELIVERY_BIND
    try:
        return KIND_DELIVERIES[name]
    except KeyError:
        known = ", ".join(sorted(KIND_DELIVERIES))
        raise NodeMountGatewayError(
            ERROR_UNSUPPORTED_KIND,
            f"kind '{name}' is not one this gateway mounts; it serves {known}",
        ) from None


def delivery_known(kind: Any) -> bool:
    """Whether this gateway serves this kind at all."""
    name = str(kind or "")
    return not name or name in KIND_DELIVERIES


def clean_source(value: Any, kind: Any = "") -> str:
    """What a grant of this kind names, validated for that kind.

    A source is not one shape. A bind names a path beneath the shared
    filesystem, a bucket names a bucket and prefix, an NFS grant names a host
    and an export, a Git grant names a URL — and a URL run through the
    relative-path rule comes out mangled rather than refused, which is the
    failure that puts a broken source on a node. So the rule follows the
    delivery.
    """
    delivery = delivery_of(kind)
    if delivery == DELIVERY_FILESYSTEM:
        return _clean_export(value)
    if delivery == DELIVERY_MATERIALIZE:
        return _clean_repository(value)
    return _clean_relative(value)


#: `host:/export`, where the host is a name or address this cluster resolves
#: and the export is absolute. Anything else is not an NFS source.
_EXPORT_RE = re.compile(r"^(?P<host>[A-Za-z0-9][A-Za-z0-9._:-]{0,252})"
                        r":(?P<export>/[A-Za-z0-9._/-]{0,1024})$")


def _clean_export(value: Any) -> str:
    """`server:/export`, the source of an NFS grant."""
    raw = str(value or "").strip()
    match = _EXPORT_RE.match(raw)
    if not match:
        raise NodeMountGatewayError(
            ERROR_INVALID_SOURCE,
            f"source '{raw}' is not an NFS export; it should read 'host:/export'",
        )
    export = match.group("export")
    if any(part in (".", "..") for part in export.split("/")):
        raise NodeMountGatewayError(
            ERROR_INVALID_SOURCE, f"export '{export}' is not a plain absolute path"
        )
    return f"{match.group('host')}:{export.rstrip('/') or '/'}"


#: `https://host/path`, or `git@host:path` — the two shapes a checkout is
#: asked for here. No `file://`, no `ext::`, no path that a local agent would
#: read off its own disk, and no leading dash for an argument parser to take
#: as a flag.
_REPOSITORY_RE = re.compile(
    r"^(?:https://[A-Za-z0-9][A-Za-z0-9._-]{0,252}(?::\d{1,5})?/[A-Za-z0-9._/~-]{1,1024}"
    r"|ssh://git@[A-Za-z0-9][A-Za-z0-9._-]{0,252}(?::\d{1,5})?/[A-Za-z0-9._/~-]{1,1024}"
    r"|git@[A-Za-z0-9][A-Za-z0-9._-]{0,252}:[A-Za-z0-9._/~-]{1,1024})$"
)


def _clean_repository(value: Any) -> str:
    """A repository URL, of the two shapes a checkout is asked for."""
    raw = str(value or "").strip()
    if not _REPOSITORY_RE.match(raw):
        raise NodeMountGatewayError(
            ERROR_INVALID_SOURCE,
            f"source '{raw}' is not a repository this gateway will clone; "
            "it should read 'https://host/org/repo' or 'git@host:org/repo'",
        )
    return raw


def _clean_relative(value: Any) -> str:
    """A source path relative to the shared filesystem root, or raise.

    The agent resolves it beneath the root without following symlinks; this
    refuses the shapes that should never reach the resolution in the first
    place, so a bad grant fails where it is written rather than on a node.
    """
    raw = str(value or "").strip().strip("/")
    if not raw:
        raise NodeMountGatewayError(ERROR_INVALID_SOURCE, "a grant needs a source path")
    if raw.startswith("/") or "\\" in raw or "\x00" in raw:
        raise NodeMountGatewayError(ERROR_INVALID_SOURCE, f"source '{raw}' is not a relative path")
    parts = [part for part in raw.split("/") if part]
    for part in parts:
        if part in (".", ".."):
            raise NodeMountGatewayError(ERROR_INVALID_SOURCE, f"source '{raw}' walks outside the shared filesystem")
    return "/".join(parts)


def clean_target(value: Any) -> str:
    """The single path segment a grant appears under in the gateway."""
    raw = str(value or "").strip()
    if not _TARGET_RE.match(raw):
        raise NodeMountGatewayError(ERROR_INVALID_TARGET, f"target '{raw}' is not one path segment")
    return raw


#: A Kubernetes object name: the agent looks one up, so a value that is not a
#: name is refused where it is written rather than at the API.
_SECRET_RE = re.compile(r"^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$")


def clean_secret(value: Any) -> str:
    raw = str(value or "").strip()
    if not _SECRET_RE.match(raw):
        raise NodeMountGatewayError(ERROR_SECRET_REFUSED, f"'{raw}' is not a Secret name")
    return raw


#: A branch, tag or commit. Git's own rule is broader; this is the part of it
#: that cannot be read as a flag, a path escape or an option.
_REVISION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$")


def clean_revision(value: Any) -> str:
    """The revision a materialized grant is pinned to."""
    raw = str(value or "").strip()
    if not _REVISION_RE.match(raw) or ".." in raw:
        raise NodeMountGatewayError(
            ERROR_INVALID_SOURCE, f"revision '{raw}' is not a branch, tag or commit"
        )
    return raw


def clean_mode(value: Any) -> str:
    raw = str(value or "rw").strip().lower()
    return raw if raw in MODES else "rw"


def grant(
    *,
    source: str,
    target: str,
    mode: str = "rw",
    uid: str = "",
    kind: str = "",
    allow_exec: bool = True,
    secret: str = "",
    revision: str = "",
) -> dict[str, Any]:
    """One entry of the mount set, validated.

    `allow_exec` is true for a Home Folder and false for data: a home folder
    holds scripts and editable installs, and mounting it `noexec` breaks them.

    `secret` names a Kubernetes Secret the node agent reads to make this
    mount — a scoped session credential for a bucket, a mount token for a
    local bridge. It is a NAME, never a value: a credential in an annotation
    is a credential anyone who can read a Pod can read. The Secret must live
    in the pod's namespace and be owned by the pod, which the agent checks
    before it reads one; a Home Folder needs none, and a grant without this
    field asks the agent for nothing it does not already have.
    """
    kind = str(kind or "")
    delivery = delivery_of(kind)
    if delivery == DELIVERY_MATERIALIZE and not str(revision or "").strip():
        # An unpinned checkout is a mount whose content depends on when it was
        # made. The creation-time path pins one; so does this.
        raise NodeMountGatewayError(
            ERROR_INVALID_SOURCE, f"a '{kind}' grant needs the revision to check out"
        )
    return {
        "uid": str(uid or ""),
        "kind": kind,
        "source": clean_source(source, kind),
        **({"revision": clean_revision(revision)} if revision else {}),
        "target": clean_target(target),
        "mode": clean_mode(mode),
        "allow_exec": bool(allow_exec),
        **({"secret": clean_secret(secret)} if secret else {}),
    }


def normalize_grants(grants: Iterable[Any] | None) -> list[dict[str, Any]]:
    """Validate a mount set and put it in one deterministic order.

    Two grants naming the same target are one grant: the first wins, the way
    the creation-time home folder mounts de-duplicate on mount path. Order is
    by target so the same set always hashes the same.
    """
    seen: set[str] = set()
    cleaned: list[dict[str, Any]] = []
    for item in grants or []:
        if not isinstance(item, dict):
            continue
        entry = grant(
            source=item.get("source"),
            target=item.get("target"),
            mode=item.get("mode", "rw"),
            uid=item.get("uid", ""),
            kind=item.get("kind", ""),
            allow_exec=bool(item.get("allow_exec", True)),
            secret=item.get("secret", ""),
            revision=item.get("revision", ""),
        )
        if entry["target"] in seen:
            continue
        seen.add(entry["target"])
        cleaned.append(entry)
    return sorted(cleaned, key=lambda entry: entry["target"])


def grants_hash(grants: Iterable[Any] | None) -> str:
    """A stable name for one mount set, used to tell applied from asked for."""
    canonical = [
        {
            **{key: entry[key] for key in ("source", "target", "mode", "allow_exec")},
            # The Secret's NAME is part of the set's identity: pointing a
            # mount at a different credential is a different mount, and the
            # agent must be asked to make it again rather than reporting the
            # previous one as still applied.
            "secret": entry.get("secret", ""),
            # And so is the revision: re-pinning a checkout to a new tag is a
            # different mount, and one whose content the sandbox would
            # otherwise keep reading at the old commit.
            "revision": entry.get("revision", ""),
        }
        for entry in normalize_grants(grants)
    ]
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def encode_grants(grants: Iterable[Any] | None) -> str:
    """The annotation value the Operator writes."""
    normalized = normalize_grants(grants)
    return json.dumps(
        {"hash": grants_hash(normalized), "mounts": normalized},
        sort_keys=True,
        separators=(",", ":"),
    )


def decode_grants(value: Any) -> list[dict[str, Any]]:
    """Read an annotation back. An unreadable one is an empty mount set.

    A Pod whose annotation cannot be parsed must not keep whatever it had
    mounted from a previous shape of it: an empty set means the agent unmounts
    everything, which is the safe reading of "I do not know what this pod may
    reach".
    """
    if not value:
        return []
    if isinstance(value, (list, tuple)):
        return normalize_grants(value)
    if isinstance(value, dict):
        return normalize_grants(value.get("mounts"))
    try:
        parsed = json.loads(str(value))
    except (TypeError, ValueError):
        return []
    if isinstance(parsed, list):
        return normalize_grants(parsed)
    if isinstance(parsed, dict):
        return normalize_grants(parsed.get("mounts"))
    return []


def encode_ready(
    *,
    applied_hash: str,
    state: str,
    mounted: Iterable[str] | None = None,
    failed: dict[str, str] | None = None,
) -> str:
    """The annotation value the node agent writes back."""
    return json.dumps(
        {
            "hash": applied_hash,
            "state": state,
            "mounted": sorted(mounted or []),
            "failed": dict(sorted((failed or {}).items())),
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def decode_ready(value: Any) -> dict[str, Any]:
    """Read the agent's answer. Anything unreadable is 'not ready yet'."""
    empty = {"hash": "", "state": "", "mounted": [], "failed": {}}
    if not value:
        return empty
    try:
        parsed = json.loads(str(value)) if not isinstance(value, dict) else value
    except (TypeError, ValueError):
        return empty
    if not isinstance(parsed, dict):
        return empty
    return {
        "hash": str(parsed.get("hash") or ""),
        "state": str(parsed.get("state") or ""),
        "mounted": [str(item) for item in parsed.get("mounted") or []],
        "failed": {str(k): str(v) for k, v in (parsed.get("failed") or {}).items()},
    }


def is_ready_for(ready_value: Any, grants: Iterable[Any] | None) -> bool:
    """Whether the agent has applied exactly the set that was asked for.

    The hash is what makes this unambiguous: an agent that answered for the
    previous mount set has not answered for this one, however recently it did.
    """
    answer = decode_ready(ready_value)
    if answer["state"] not in (STATE_READY, STATE_DEGRADED):
        return False
    return answer["hash"] == grants_hash(grants)


def gateway_path(target: str) -> str:
    """Where a granted folder appears in the sandbox's gateway."""
    return f"{NODE_MOUNT_GATEWAY_MOUNT_PATH}/{clean_target(target)}"


def home_link_path(target: str) -> str:
    """Where the sandbox reaches it: the path creation-time mounts use."""
    return f"{RUNTIME_HOME_MOUNT_PATH}/{clean_target(target)}"
