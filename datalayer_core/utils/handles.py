# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utilities for formatting and normalizing user handles."""

import re
import unicodedata

EXT_URN_PREFIX = "urn:dla:iam:ext::"

_PROVIDER_LABELS = {
    "github": "GitHub",
    "google": "Google",
    "linkedin": "LinkedIn",
}


def is_external_urn_handle(handle: str | None = None) -> bool:
    """
    Check whether a handle is an external identity URN.

    Parameters
    ----------
    handle : str, optional
        The handle to inspect.

    Returns
    -------
    bool
        ``True`` if the handle is an external URN handle, ``False`` otherwise.
    """
    normalized = (handle or "").strip().lower()
    return normalized.startswith(EXT_URN_PREFIX)


def format_friendly_handle(handle: str | None = None) -> str:
    """
    Format a handle into a human-friendly display string.

    Internal handles are returned as-is. External identity URN handles are
    rendered as a provider label followed by a truncated identifier.

    Parameters
    ----------
    handle : str, optional
        The handle to format.

    Returns
    -------
    str
        A friendly display string. Returns ``"unknown"`` for empty handles.
    """
    normalized_handle = (handle or "").strip()
    if not normalized_handle:
        return "unknown"

    if not is_external_urn_handle(normalized_handle):
        return normalized_handle

    external_id = normalized_handle[len(EXT_URN_PREFIX) :]
    provider_raw, _, identifier_raw = external_id.partition(":")
    provider = provider_raw.lower()
    provider_label = _PROVIDER_LABELS.get(provider, provider_raw or "External")
    identifier = identifier_raw.strip()

    if not identifier:
        return provider_label

    short_identifier = f"{identifier[:15]}..." if len(identifier) > 18 else identifier

    return f"{provider_label} {short_identifier}"


def format_display_name(
    first_name: str | None = None,
    last_name: str | None = None,
    handle: str | None = None,
) -> str:
    """
    Build a friendly display name from user profile fields.

    Prefers a ``"First Last"`` full name. When neither name is available, it
    falls back to a friendly rendering of the handle, and finally to
    ``"unknown"``.

    Parameters
    ----------
    first_name : str, optional
        The user's first name.
    last_name : str, optional
        The user's last name.
    handle : str, optional
        The user's handle, used as a fallback.

    Returns
    -------
    str
        A human-friendly display name.
    """
    parts = [str(first_name or "").strip(), str(last_name or "").strip()]
    full_name = " ".join(part for part in parts if part)
    if full_name:
        return full_name
    return format_friendly_handle(handle)


def normalize_handle_from_name(value: str | None = None) -> str:
    """
    Normalize a display name into a handle-safe slug.

    Parameters
    ----------
    value : str, optional
        The name to normalize.

    Returns
    -------
    str
        A lowercase, hyphen-separated slug, or an empty string for empty input.
    """
    source = str(value or "").strip()
    if not source:
        return ""

    replacements = {
        "ß": "ss",
        "æ": "ae",
        "Æ": "ae",
        "œ": "oe",
        "Œ": "oe",
        "ø": "o",
        "Ø": "o",
        "đ": "d",
        "Đ": "d",
        "þ": "th",
        "Þ": "th",
        "ł": "l",
        "Ł": "l",
    }
    for original, replacement in replacements.items():
        source = source.replace(original, replacement)

    transliterated = "".join(
        char
        for char in unicodedata.normalize("NFKD", source)
        if not unicodedata.combining(char)
    )

    slug = transliterated.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug
