# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Pydantic models for IAM (Identity and Access Management) service.
These models are used for authentication, users, organizations, teams, credits, and reservations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, EmailStr, Field


# Authentication Models
class LoginRequest(BaseModel):
    """Login request model."""

    handle: Optional[str] = Field(None, description="User handle")
    password: Optional[str] = Field(None, description="User password")
    token: Optional[str] = Field(None, description="Authentication token")


class ProxyRequest(BaseModel):
    """Proxy request model."""

    request_method: str = Field(..., description="HTTP method")
    request_url: str = Field(..., description="Request URL")
    request_token: str = Field(..., description="Request token")
    request_body: Optional[Dict[str, Any]] = Field(None, description="Request body")


class JoinRequest(BaseModel):
    """Request to join platform."""

    handle: str = Field(..., description="Desired user handle")
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., alias="firstName", description="User first name")
    last_name: str = Field(..., alias="lastName", description="User last name")
    password: str = Field(..., description="User password")
    password_confirm: str = Field(
        ..., alias="passwordConfirm", description="Password confirmation"
    )


class JoinWithInviteRequest(BaseModel):
    """Join with invite token request."""

    invite_token: str = Field(..., description="Invitation token")
    handle: str = Field(..., description="Desired user handle")
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., alias="firstName", description="User first name")
    last_name: str = Field(..., alias="lastName", description="User last name")
    password: str = Field(..., description="User password")
    password_confirm: str = Field(
        ..., alias="passwordConfirm", description="Password confirmation"
    )


class PasswordResetRequest(BaseModel):
    """Password reset request model."""

    handle: str = Field(..., description="User handle")


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model."""

    new_password: str = Field(..., description="New password")
    confirm_password: str = Field(..., description="Confirm new password")


class EmailUpdateRequest(BaseModel):
    """Email update request model."""

    new_email: EmailStr = Field(..., description="New email address")


class EmailUpdateConfirm(BaseModel):
    """Email update confirmation model."""

    confirmation_token: str = Field(..., description="Email confirmation token")


# User Models
class UserModel(BaseModel):
    """
    User data model that combines IAM user information with profile functionality.
    This model serves as both the IAM user representation and user profile.
    """

    id: str = Field(..., description="User ID")
    uid: str = Field(..., description="User UID")
    handle_s: str = Field(..., description="User handle")
    email_s: Optional[EmailStr] = Field(None, description="User email address")
    first_name_t: str = Field(..., description="User first name")
    last_name_t: str = Field(..., description="User last name")
    type_s: str = Field(..., description="User type")
    origin_s: Optional[str] = Field(None, description="User origin")
    creation_ts_dt: Optional[Union[str, datetime]] = Field(None, description="Creation timestamp")
    join_request_ts_dt: Optional[Union[str, datetime]] = Field(
        None, description="Join request timestamp"
    )
    join_ts_dt: Optional[Union[str, datetime]] = Field(None, description="Join timestamp")
    last_update_ts_dt: Optional[Union[str, datetime]] = Field(
        None, description="Last update timestamp"
    )
    roles_ss: Optional[List[str]] = Field(
        default_factory=list, description="User roles"
    )
    avatar_url_s: Optional[str] = Field(None, description="User avatar URL")
    linked_contact_uid: Optional[str] = Field(None, description="Linked contact UID")
    onboarding_s: Optional[str] = Field(None, description="User onboarding data")
    mfa_secret_s: Optional[str] = Field(None, description="MFA secret")
    mfa_url_s: Optional[str] = Field(None, description="MFA URL")
    unsubscribed_from_outbounds_b: Optional[bool] = Field(None, description="Unsubscribed from outbound emails")
    email_token_s: Optional[str] = Field(None, description="Email verification token")
    email_update_s: Optional[str] = Field(None, description="Email update request")
    events: Optional[List[Dict[str, Any]]] = Field(None, description="User events")
    settings: Optional[Dict[str, Any]] = Field(None, description="User settings")

    @property
    def handle(self) -> str:
        """Get user handle for profile compatibility."""
        return self.handle_s

    @property
    def email(self) -> str:
        """Get user email for profile compatibility."""
        return self.email_s

    @property
    def first_name(self) -> str:
        """Get user first name for profile compatibility."""
        return self.first_name_t

    @property
    def last_name(self) -> str:
        """Get user last name for profile compatibility."""
        return self.last_name_t

    @property
    def display_name(self) -> str:
        """Get display name (defaults to handle)."""
        return self.handle_s

    @property
    def roles(self) -> List[str]:
        """Get user roles for profile compatibility."""
        return self.roles_ss or []

    @classmethod
    def from_data(cls, data: Dict[str, Any]) -> "UserModel":
        """
        Create a UserData instance from raw data dictionary.
        Provides backward compatibility with ProfileModel.from_data().
        """
        return cls(
            id=data["id"],
            uid=data["uid"],
            handle_s=data["handle_s"],
            email_s=data["email_s"],
            first_name_t=data["first_name_t"],
            last_name_t=data["last_name_t"],
            type_s=data.get("type_s", "user"),
            origin_s=data.get("origin_s"),
            creation_ts_dt=data.get("creation_ts_dt"),
            join_request_ts_dt=data.get("join_request_ts_dt"),
            join_ts_dt=data.get("join_ts_dt"),
            last_update_ts_dt=data.get("last_update_ts_dt"),
            roles_ss=data.get("roles_ss", []),
            avatar_url_s=data.get("avatar_url_s"),
            linked_contact_uid=data.get("linked_contact_uid"),
            onboarding_s=data.get("onboarding_s"),
            mfa_secret_s=data.get("mfa_secret_s"),
            mfa_url_s=data.get("mfa_url_s"),
            unsubscribed_from_outbounds_b=data.get("unsubscribed_from_outbounds_b"),
            email_token_s=data.get("email_token_s"),
            email_update_s=data.get("email_update_s"),
            events=data.get("events"),
            settings=data.get("settings"),
        )

    def __repr__(self) -> str:
        return (
            f"UserData(handle='{self.handle_s}', email='{self.email_s}', "
            f"first_name='{self.first_name_t}', last_name='{self.last_name_t}', "
            f"uid='{self.uid}', roles={self.roles_ss})"
        )


class UserProfileModel(BaseModel):
    """User profile update model."""

    first_name: Optional[str] = Field(
        None, alias="firstName", description="User first name"
    )
    last_name: Optional[str] = Field(
        None, alias="lastName", description="User last name"
    )
    display_name: Optional[str] = Field(None, description="Display name")


class UserOnboardingModel(BaseModel):
    """User onboarding data model."""

    completed_steps: List[str] = Field(
        default_factory=list, description="Completed onboarding steps"
    )
    current_step: Optional[str] = Field(None, description="Current onboarding step")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Onboarding metadata"
    )


class UserSettingsModel(BaseModel):
    """User settings model."""

    preferences: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="User preferences"
    )
    notifications: Optional[Dict[str, bool]] = Field(
        default_factory=dict, description="Notification settings"
    )
    theme: Optional[str] = Field(None, description="UI theme preference")


class UserSearchRequest(BaseModel):
    """User search request model."""

    query: Optional[str] = Field(None, alias="namingPattern", description="Search query")
    email: Optional[EmailStr] = Field(None, description="Filter by email")
    handle: Optional[str] = Field(None, description="Filter by handle")
    roles: Optional[List[str]] = Field(None, description="Filter by roles")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum results")
    offset: int = Field(default=0, ge=0, description="Results offset")


# Organization Models
class OrganizationMember(BaseModel):
    """Organization member model."""

    id: str = Field(..., description="Member ID")
    uid: str = Field(..., description="Member UID")
    type_s: str = Field(..., description="Member type")
    handle_s: str = Field(..., description="Member handle")
    first_name_t: str = Field(..., description="Member first name")
    last_name_t: str = Field(..., description="Member last name")
    email_s: EmailStr = Field(..., description="Member email")
    roles_ss: List[str] = Field(
        default_factory=list, description="Member roles in organization"
    )


class OrganizationData(BaseModel):
    """Organization data model."""

    id: str = Field(..., description="Organization ID")
    uid: str = Field(..., description="Organization UID")
    type_s: str = Field(..., description="Organization type")
    handle_s: str = Field(..., description="Organization handle")
    name_t: str = Field(..., description="Organization name")
    description_t: Optional[str] = Field(None, description="Organization description")
    public_b: bool = Field(default=False, description="Whether organization is public")
    members: List[OrganizationMember] = Field(
        default_factory=list, description="Organization members"
    )


class OrganizationRequest(BaseModel):
    """Organization create/update request model."""

    handle: str = Field(..., description="Organization handle")
    name: str = Field(..., description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    public: bool = Field(default=False, description="Whether organization is public")
    type: str = Field(default="organization", description="Organization type")


# Team Models
class TeamMember(BaseModel):
    """Team member model."""

    id: str = Field(..., description="Member ID")
    uid: str = Field(..., description="Member UID")
    type_s: str = Field(..., description="Member type")
    handle_s: str = Field(..., description="Member handle")
    first_name_t: str = Field(..., description="Member first name")
    last_name_t: str = Field(..., description="Member last name")
    email_s: EmailStr = Field(..., description="Member email")
    roles_ss: List[str] = Field(
        default_factory=list, description="Member roles in team"
    )


class TeamData(BaseModel):
    """Team data model."""

    id: str = Field(..., description="Team ID")
    uid: str = Field(..., description="Team UID")
    handle_s: str = Field(..., description="Team handle")
    name_t: str = Field(..., description="Team name")
    description_t: Optional[str] = Field(None, description="Team description")
    members: List[TeamMember] = Field(default_factory=list, description="Team members")


class TeamRequest(BaseModel):
    """Team create/update request model."""

    handle: str = Field(..., description="Team handle")
    name: str = Field(..., description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    organization_id: str = Field(..., description="Parent organization ID")


# Credits and Reservations Models
class ResourceRequirements(BaseModel):
    """Kubernetes pod resource requirements."""

    cpu: Optional[str] = Field(None, description="CPU requirements")
    memory: Optional[str] = Field(None, description="Memory requirements")
    nvidia_gpu: Optional[str] = Field(
        None, alias="nvidia.com/gpu", description="GPU requirements"
    )


class CreditsData(BaseModel):
    """Credits data model."""

    credits: float = Field(..., description="Available credits")
    quota: Optional[float] = Field(None, description="Credits quota")
    last_update: Union[str, datetime] = Field(..., description="Last update timestamp")


class ReservationData(BaseModel):
    """Reservation data model."""

    id: str = Field(..., description="Reservation ID")
    account_uid: str = Field(..., description="Account UID")
    credits: float = Field(..., description="Reserved credits")
    resource: str = Field(..., description="Resource identifier")
    resource_type: str = Field(..., description="Resource type")
    last_update: datetime = Field(..., description="Last update timestamp")
    burning_rate: float = Field(..., description="Credits burning rate per second")
    start_date: datetime = Field(..., description="Reservation start date")


class UsageData(BaseModel):
    """Usage data model."""

    account_uid: str = Field(..., description="Account UID")
    resource_uid: str = Field(..., description="Resource UID")
    resource_type: str = Field(..., description="Resource type")
    resource_given_name: str = Field(..., description="Resource given name")
    start_date: datetime = Field(..., description="Usage start date")
    end_date: Optional[datetime] = Field(None, description="Usage end date")
    updated_at: datetime = Field(..., description="Last update timestamp")
    pod_resources: Optional[ResourceRequirements] = Field(
        None, description="Pod resources"
    )
    burning_rate: float = Field(..., description="Credits burning rate per second")
    credits_limit: float = Field(..., description="Credits limit")
    credits: float = Field(..., description="Credits consumed")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Additional metadata"
    )


class CreditsUpdateRequest(BaseModel):
    """Credits update request model."""

    credits: float = Field(..., description="New credits amount")
    operation: Optional[str] = Field(
        default="set", description="Operation type (set, add, subtract)"
    )


class QuotaUpdateRequest(BaseModel):
    """Quota update request model."""

    quota: float = Field(..., description="New quota amount")
    user_uid: Optional[str] = Field(None, description="Target user UID")


class ReservationRequest(BaseModel):
    """Reservation create request model."""

    resource: str = Field(..., description="Resource identifier")
    resource_type: str = Field(..., description="Resource type")
    credits: float = Field(..., description="Credits to reserve")
    account_uid: str = Field(..., description="Account UID")
    burning_rate: Optional[float] = Field(None, description="Expected burning rate")


# Checkout and Billing Models
class CheckoutPortalRequest(BaseModel):
    """Checkout portal request model."""

    return_url: str = Field(..., description="Return URL after checkout")


class CheckoutPortalModel(BaseModel):
    """Checkout portal response data."""

    url: str = Field(..., description="Checkout portal URL")
    route: str = Field(..., description="Internal frontend client route")
    is_modal: bool = Field(default=False, description="Whether route opens a modal")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Additional metadata"
    )


# Secret and Token Models
class SecretModel(BaseModel):
    """Secret data model."""

    id: str = Field(..., description="Secret ID")
    uid: str = Field(..., description="Secret UID")
    variant_s: str = Field(..., description="Secret variant")
    name_s: str = Field(..., description="Secret name")
    description_t: Optional[str] = Field(None, description="Secret description")
    value_s: str = Field(..., description="Secret value")


class TokenModel(BaseModel):
    """Token data model."""

    id: str = Field(..., description="Token ID")
    uid: str = Field(..., description="Token UID")
    variant_s: str = Field(..., description="Token variant")
    name_s: str = Field(..., description="Token name")
    description_t: Optional[str] = Field(None, description="Token description")
    expiration_ts_dt: Optional[datetime] = Field(
        None, description="Token expiration timestamp"
    )


class DatasourceModel(BaseModel):
    """Datasource data model."""

    id: str = Field(..., description="Datasource ID")
    uid: str = Field(..., description="Datasource UID")
    variant_s: str = Field(..., description="Datasource variant")
    name_s: str = Field(..., description="Datasource name")
    description_t: Optional[str] = Field(None, description="Datasource description")
    database_s: str = Field(..., description="Database name")
    output_bucket_s: str = Field(..., description="Output bucket")


# Response data models with structured data
class LoginResponseData(BaseModel):
    """Login response data model."""

    user: UserModel = Field(..., description="User data")
    token: str = Field(..., description="Authentication token")


class UserListResponseData(BaseModel):
    """User list response data model."""

    users: List[UserModel] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")


class OrganizationListResponseData(BaseModel):
    """Organization list response data model."""

    organizations: List[OrganizationData] = Field(
        ..., description="List of organizations"
    )
    total: int = Field(..., description="Total number of organizations")


class TeamListResponseData(BaseModel):
    """Team list response data model."""

    teams: List[TeamData] = Field(..., description="List of teams")
    total: int = Field(..., description="Total number of teams")


class ReservationListResponseData(BaseModel):
    """Reservation list response data model."""

    reservations: List[ReservationData] = Field(..., description="List of reservations")
    total: int = Field(..., description="Total number of reservations")


# Profile compatibility alias
ProfileModel = UserModel  # ProfileModel is now an alias for UserData
