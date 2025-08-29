# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Pydantic models for Datalayer API endpoints.

This module contains Pydantic models for all request bodies and responses
from the IAM and Runtimes APIs. Uses Pydantic v2 syntax.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Base Models
class BaseResponse(BaseModel):
    """Base response model for all API endpoints."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
        extra="forbid",
    )

    success: bool = Field(description="Whether the request was successful")
    message: str = Field(description="Response message")


# Enums
class RuntimeType(str, Enum):
    """Runtime type enumeration."""

    notebook = "notebook"
    cell = "cell"


class ProviderType(str, Enum):
    """OAuth provider type enumeration."""

    github = "github"
    linkedin = "linkedin"
    okta = "okta"


class SecretVariant(str, Enum):
    """Secret variant enumeration."""

    generic = "generic"
    password = "password"
    key = "key"
    token = "token"


class TokenVariant(str, Enum):
    """Token variant enumeration."""

    user = "user"
    service = "service"


class RuntimeSnapshotStatus(str, Enum):
    """Runtime snapshot status enumeration."""

    creating = "creating"
    ready = "ready"
    failed = "failed"


# IAM Models
class User(BaseModel):
    """User model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique user identifier")
    email: str = Field(description="User email address")
    firstName: str = Field(description="User first name")
    lastName: str = Field(description="User last name")
    handle: str = Field(description="User handle/username")
    avatar: Optional[str] = Field(None, description="User avatar URL")
    created_at: Optional[datetime] = Field(None, description="User creation timestamp")
    updated_at: Optional[datetime] = Field(
        None, description="User last update timestamp"
    )
    verified: Optional[bool] = Field(None, description="Whether user is verified")


class Organization(BaseModel):
    """Organization model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique organization identifier")
    handle: str = Field(description="Organization handle")
    name: str = Field(description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    avatar: Optional[str] = Field(None, description="Organization avatar URL")
    created_at: Optional[datetime] = Field(
        None, description="Organization creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        None, description="Organization last update timestamp"
    )
    members: Optional[List[str]] = Field(None, description="List of member UIDs")


class Team(BaseModel):
    """Team model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique team identifier")
    handle: str = Field(description="Team handle")
    name: str = Field(description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    organization_uid: str = Field(description="Parent organization UID")
    created_at: Optional[datetime] = Field(None, description="Team creation timestamp")
    updated_at: Optional[datetime] = Field(
        None, description="Team last update timestamp"
    )
    members: Optional[List[str]] = Field(None, description="List of member UIDs")


class Secret(BaseModel):
    """Secret model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique secret identifier")
    name_s: str = Field(description="Secret name")
    description_t: Optional[str] = Field(None, description="Secret description")
    variant_s: SecretVariant = Field(description="Secret variant/type")
    account_uid: str = Field(description="Account UID that owns the secret")
    created_at: Optional[datetime] = Field(
        None, description="Secret creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        None, description="Secret last update timestamp"
    )


class Token(BaseModel):
    """Token model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique token identifier")
    name_s: str = Field(description="Token name")
    description_t: Optional[str] = Field(None, description="Token description")
    variant_s: TokenVariant = Field(description="Token variant/type")
    account_uid: str = Field(description="Account UID that owns the token")
    expires_at: Optional[datetime] = Field(
        None, description="Token expiration timestamp"
    )
    created_at: Optional[datetime] = Field(None, description="Token creation timestamp")
    updated_at: Optional[datetime] = Field(
        None, description="Token last update timestamp"
    )


class Datasource(BaseModel):
    """Datasource model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique datasource identifier")
    name: str = Field(description="Datasource name")
    variant: str = Field(description="Datasource variant/type")
    database: Optional[str] = Field(None, description="Database name")
    account_uid: str = Field(description="Account UID that owns the datasource")
    created_at: Optional[datetime] = Field(
        None, description="Datasource creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        None, description="Datasource last update timestamp"
    )


class Credits(BaseModel):
    """Credits model."""

    model_config = ConfigDict(validate_assignment=True, extra="forbid")

    credits: float = Field(description="Current credit balance")
    quota: float = Field(description="Credit quota limit")
    last_update: datetime = Field(description="Last credits update timestamp")


class Reservation(BaseModel):
    """Reservation model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    id: str = Field(description="Unique reservation identifier")
    account_uid: Optional[str] = Field(None, description="Account UID")
    credits: float = Field(description="Reserved credits amount")
    resource: str = Field(description="Reserved resource identifier")
    resource_type: str = Field(description="Type of reserved resource")
    last_update: datetime = Field(description="Last reservation update timestamp")
    burning_rate: float = Field(ge=0, description="Credit burning rate per second")
    start_date: datetime = Field(description="Reservation start timestamp")


class Usage(BaseModel):
    """Usage model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    account_uid: str = Field(description="Account UID")
    resource_uid: str = Field(description="Resource UID")
    resource_type: str = Field(description="Type of resource")
    resource_given_name: str = Field(description="Human-readable resource name")
    start_date: datetime = Field(description="Usage start timestamp")
    end_date: Optional[datetime] = Field(None, description="Usage end timestamp")
    updated_at: datetime = Field(description="Last usage update timestamp")
    pod_resources: Optional[Dict[str, Any]] = Field(
        None, description="Pod resource specifications"
    )
    burning_rate: float = Field(ge=0, description="Credit burning rate per second")
    credits_limit: float = Field(ge=0, description="Credit limit for this usage")
    credits: Optional[float] = Field(None, description="Credits consumed")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional usage metadata"
    )


class OrganizationMember(BaseModel):
    """Organization member model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    id: str = Field(description="Member ID")
    uid: str = Field(description="Member UID")
    type_s: str = Field(description="Member type")
    handle_s: str = Field(description="Member handle")
    first_name_t: str = Field(description="Member first name")
    last_name_t: str = Field(description="Member last name")
    email_s: str = Field(description="Member email address")
    roles_ss: List[str] = Field(description="Member roles")


class TeamMember(BaseModel):
    """Team member model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    id: str = Field(description="Member ID")
    uid: str = Field(description="Member UID")
    type_s: str = Field(description="Member type")
    handle_s: str = Field(description="Member handle")
    first_name_t: str = Field(description="Member first name")
    last_name_t: str = Field(description="Member last name")
    email_s: str = Field(description="Member email address")
    roles_ss: List[str] = Field(description="Member roles")


class CheckoutPortal(BaseModel):
    """Checkout portal model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    url: str = Field(description="Checkout Portal URL")
    route: str = Field(description="Internal frontend client route")
    is_modal: bool = Field(False, description="Whether portal is modal")
    metadata: Dict[str, Any] = Field(description="JSON-serializable metadata")


# Runtime Models
class Resources(BaseModel):
    """Resource specifications model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    cpu: str = Field(description="CPU resource specification")
    memory: str = Field(description="Memory resource specification")
    nvidia_com_gpu: Optional[str] = Field(
        None, alias="nvidia.com/gpu", description="GPU resource specification"
    )


class ResourcesRanges(BaseModel):
    """Resource ranges model."""

    model_config = ConfigDict(validate_assignment=True, extra="forbid")

    requests: Optional[Resources] = Field(None, description="Minimum resource requests")
    limits: Resources = Field(description="Maximum resource limits")


class Content(BaseModel):
    """Content model for runtime content."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    name: str = Field(description="Content name")
    mount: str = Field(description="Mount path")


class Environment(BaseModel):
    """Environment model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    name: str = Field(description="Environment name")
    title: str = Field(description="Environment display title")
    description: Optional[str] = Field(None, description="Environment description")
    dockerImage: str = Field(description="Docker image for the environment")
    language: str = Field(description="Programming language")
    burning_rate: float = Field(ge=0, description="Credit burning rate per second")
    resources: Resources = Field(description="Default resource specifications")
    resourcesRanges: Optional[ResourcesRanges] = Field(
        None, description="Resource ranges"
    )
    owner: Optional[str] = Field(None, description="Environment owner")
    visibility: Optional[str] = Field(None, description="Environment visibility")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional environment metadata"
    )


class Runtime(BaseModel):
    """Runtime model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique runtime identifier")
    burning_rate: float = Field(ge=0, description="Credit burning rate per second")
    type: RuntimeType = Field(description="Runtime type")
    environment_name: str = Field(description="Environment name")
    pod_name: str = Field(description="Kubernetes pod name")
    token: str = Field(description="Runtime access token")
    ingress: str = Field(description="Runtime ingress URL")
    given_name: Optional[str] = Field(None, description="Human-readable runtime name")
    reservation_id: Optional[str] = Field(None, description="Associated reservation ID")
    started_at: Optional[datetime] = Field(None, description="Runtime start timestamp")
    expired_at: Optional[datetime] = Field(
        None, description="Runtime expiration timestamp"
    )
    capabilities: Optional[List[str]] = Field(None, description="Runtime capabilities")
    credits_limit: Optional[float] = Field(
        None, ge=0, description="Credit limit for this runtime"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional runtime metadata"
    )


class RuntimeSnapshot(BaseModel):
    """Runtime snapshot model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    uid: str = Field(description="Unique snapshot identifier")
    name: str = Field(description="Snapshot name")
    description: Optional[str] = Field(None, description="Snapshot description")
    environment: str = Field(description="Source environment name")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Snapshot metadata")
    size: Optional[float] = Field(None, ge=0, description="Snapshot size in bytes")
    updated_at: Optional[datetime] = Field(
        None, description="Last snapshot update timestamp"
    )
    format: Optional[str] = Field(None, description="Snapshot format")
    status: Optional[RuntimeSnapshotStatus] = Field(None, description="Snapshot status")


# Request Models
class LoginRequest(BaseModel):
    """Login request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    token: Optional[str] = Field(None, description="Authentication token")
    handle: Optional[str] = Field(None, description="User handle")
    password: Optional[str] = Field(None, description="User password")

    @field_validator("token")
    @classmethod
    def validate_token_or_credentials(
        cls, v: Optional[str], info: Any
    ) -> Optional[str]:
        """
        Validate that either token or handle+password is provided.

        Parameters
        ----------
        v : Optional[str]
            The token value to validate.
        info : Any
            Pydantic validation info object containing field data.

        Returns
        -------
        Optional[str]
            The validated token value.

        Raises
        ------
        ValueError
            If neither token nor handle+password combination is provided.
        """
        if hasattr(info, "data") and info.data:
            values = info.data
            if not v and not (values.get("handle") and values.get("password")):
                raise ValueError("Either token or handle+password must be provided")
        return v


class UserRegistrationRequest(BaseModel):
    """User registration request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    handle: str = Field(description="User handle/username")
    email: str = Field(description="User email address")
    firstName: str = Field(description="User first name")
    lastName: str = Field(description="User last name")
    password: str = Field(min_length=8, description="User password")


class UserForm(BaseModel):
    """User form model for registration/signup."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    handle: str = Field(description="User handle/username")
    email: str = Field(description="User email address")
    firstName: str = Field(description="User first name")
    lastName: str = Field(description="User last name")
    password: str = Field(description="User password")
    passwordConfirm: str = Field(description="Password confirmation")


class CheckoutPortalRequest(BaseModel):
    """Checkout portal request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    return_url: str = Field(description="Return URL after checkout")


class OrganizationCreateRequest(BaseModel):
    """Organization creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    handle: str = Field(description="Organization handle")
    name: str = Field(description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")


class TeamCreateRequest(BaseModel):
    """Team creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    handle: str = Field(description="Team handle")
    name: str = Field(description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    organization_uid: str = Field(description="Parent organization UID")


class SecretCreateRequest(BaseModel):
    """Secret creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    name: str = Field(description="Secret name")
    description: Optional[str] = Field(None, description="Secret description")
    value: str = Field(description="Secret value")
    secret_type: SecretVariant = Field(SecretVariant.generic, description="Secret type")


class TokenCreateRequest(BaseModel):
    """Token creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    name: str = Field(description="Token name")
    description: str = Field(description="Token description")
    expires: Optional[int] = Field(None, gt=0, description="Expiration in days")


class RuntimeCreateRequest(BaseModel):
    """Runtime creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    environment_name: str = Field(description="Environment name")
    type: RuntimeType = Field(RuntimeType.notebook, description="Runtime type")
    given_name: Optional[str] = Field(None, description="Human-readable runtime name")
    credits_limit: float = Field(ge=0, description="Credit limit for this runtime")
    capabilities: Optional[List[str]] = Field(None, description="Runtime capabilities")
    from_snapshot_uid: Optional[str] = Field(
        None, alias="from", description="Runtime snapshot UID to create from"
    )


class RuntimeSnapshotCreateRequest(BaseModel):
    """Runtime snapshot creation request model."""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )

    pod_name: str = Field(description="Runtime pod name to snapshot")
    name: str = Field(description="Snapshot name")
    description: Optional[str] = Field(None, description="Snapshot description")
    stop: bool = Field(True, description="Whether to stop runtime after snapshot")


# Response Models
class LoginResponse(BaseResponse):
    """Login response model."""

    user: Optional[User] = Field(None, description="User information")
    token: Optional[str] = Field(None, description="JWT token")


class UserResponse(BaseResponse):
    """User response model."""

    user: Optional[User] = Field(None, description="User information")


class UsersResponse(BaseResponse):
    """Users list response model."""

    users: List[User] = Field(default_factory=list, description="List of users")


class OrganizationResponse(BaseResponse):
    """Organization response model."""

    organization: Optional[Organization] = Field(
        None, description="Organization information"
    )


class OrganizationsResponse(BaseResponse):
    """Organizations list response model."""

    organizations: List[Organization] = Field(
        default_factory=list, description="List of organizations"
    )


class TeamResponse(BaseResponse):
    """Team response model."""

    team: Optional[Team] = Field(None, description="Team information")


class TeamsResponse(BaseResponse):
    """Teams list response model."""

    teams: List[Team] = Field(default_factory=list, description="List of teams")


class SecretResponse(BaseResponse):
    """Secret response model."""

    secret: Optional[Secret] = Field(None, description="Secret information")


class SecretsResponse(BaseResponse):
    """Secrets list response model."""

    secrets: List[Secret] = Field(default_factory=list, description="List of secrets")


class TokenResponse(BaseResponse):
    """Token response model."""

    token: Optional[Token] = Field(None, description="Token information")
    access_token: Optional[str] = Field(
        None, description="The actual token value (only on creation)"
    )


class TokensResponse(BaseResponse):
    """Tokens list response model."""

    tokens: List[Token] = Field(default_factory=list, description="List of tokens")


class CreditsResponse(BaseResponse):
    """Credits response model."""

    credits: Optional[Credits] = Field(None, description="Credits information")


class ReservationsResponse(BaseResponse):
    """Reservations list response model."""

    reservations: List[Reservation] = Field(
        default_factory=list, description="List of reservations"
    )


class UsageResponse(BaseResponse):
    """Usage list response model."""

    usage: List[Usage] = Field(
        default_factory=list, description="List of usage records"
    )


class EnvironmentsResponse(BaseResponse):
    """Environments list response model."""

    environments: List[Environment] = Field(
        default_factory=list, description="List of environments"
    )


class RuntimeResponse(BaseResponse):
    """Runtime response model."""

    runtime: Optional[Runtime] = Field(None, description="Runtime information")


class RuntimesResponse(BaseResponse):
    """Runtimes list response model."""

    runtimes: List[Runtime] = Field(
        default_factory=list, description="List of runtimes"
    )


class RuntimeSnapshotResponse(BaseResponse):
    """Runtime snapshot response model."""

    snapshot: Optional[RuntimeSnapshot] = Field(
        None, description="Runtime snapshot information"
    )


class RuntimeSnapshotsResponse(BaseResponse):
    """Runtime snapshots list response model."""

    snapshots: List[RuntimeSnapshot] = Field(
        default_factory=list, description="List of runtime snapshots"
    )


class OrganizationMemberResponse(BaseResponse):
    """Organization member response model."""

    member: Optional[OrganizationMember] = Field(
        None, description="Organization member information"
    )


class OrganizationMembersResponse(BaseResponse):
    """Organization members list response model."""

    members: List[OrganizationMember] = Field(
        default_factory=list, description="List of organization members"
    )


class TeamMemberResponse(BaseResponse):
    """Team member response model."""

    member: Optional[TeamMember] = Field(None, description="Team member information")


class TeamMembersResponse(BaseResponse):
    """Team members list response model."""

    members: List[TeamMember] = Field(
        default_factory=list, description="List of team members"
    )


class CheckoutPortalResponse(BaseResponse):
    """Checkout portal response model."""

    portal: Optional[CheckoutPortal] = Field(
        None, description="Checkout portal information"
    )


class UserFormResponse(BaseResponse):
    """User form response model."""

    user: Optional[User] = Field(
        None, description="User information from form submission"
    )
