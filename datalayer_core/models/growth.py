# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Pydantic models for Growth service.
These models are used for user growth, invitations, contacts, and outbound messaging.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class User(BaseModel):
    """User model for growth service."""

    id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email address")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    created_at: Optional[str] = Field(None, description="User creation timestamp")
    updated_at: Optional[str] = Field(None, description="User last update timestamp")


class Contact(BaseModel):
    """Contact model for growth service."""

    id: Optional[str] = Field(None, description="Unique contact identifier")
    email: str = Field(..., description="Contact email address")
    first_name: Optional[str] = Field(
        None, alias="firstName", description="Contact first name"
    )
    last_name: Optional[str] = Field(
        None, alias="lastName", description="Contact last name"
    )
    affiliation: Optional[str] = Field(
        None, description="Contact organization or affiliation"
    )
    social_url: Optional[str] = Field(None, description="Contact social media URL")
    created_at: Optional[str] = Field(None, description="Contact creation timestamp")
    updated_at: Optional[str] = Field(None, description="Contact last update timestamp")


class WaitingListRequest(BaseModel):
    """Waiting list registration request."""

    first_name: str = Field(
        ..., min_length=1, alias="firstName", description="First name"
    )
    last_name: str = Field(..., min_length=1, alias="lastName", description="Last name")
    email: str = Field(..., min_length=1, description="Email address")
    affiliation: str = Field(
        ..., min_length=1, description="Organization or affiliation"
    )


class InviteRequest(BaseModel):
    """Invite request model."""

    first_name: str = Field(
        ..., min_length=1, alias="firstName", description="First name"
    )
    last_name: str = Field(..., min_length=1, alias="lastName", description="Last name")
    email: str = Field(..., min_length=1, description="Email address")
    message: str = Field(..., min_length=1, description="Invitation message")
    brand: str = Field(..., min_length=1, description="Brand identifier")


class InviteRequestPublic(BaseModel):
    """Public invite request model."""

    first_name: str = Field(..., min_length=1, description="First name")
    last_name: str = Field(..., min_length=1, description="Last name")
    email: str = Field(..., min_length=1, description="Email address")
    social_url: str = Field(..., min_length=1, description="Social media URL")


class SurveyRequest(BaseModel):
    """Survey request model."""

    survey_id: str = Field(..., description="Survey identifier")
    responses: Dict[str, Any] = Field(default_factory=dict, description="Survey responses")
    user_id: Optional[str] = Field(None, description="User identifier")
    contact_id: Optional[str] = Field(None, description="Contact identifier")


class ContactRequest(BaseModel):
    """Contact request model."""

    email: str = Field(..., description="Contact email address")
    first_name: Optional[str] = Field(None, description="Contact first name")
    last_name: Optional[str] = Field(None, description="Contact last name")
    affiliation: Optional[str] = Field(None, description="Contact organization")
    tags: Optional[List[str]] = Field(default_factory=list, description="Contact tags")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Additional metadata"
    )


class ContactSearchRequest(BaseModel):
    """Contact search request model."""

    query: Optional[str] = Field(None, description="Search query")
    email: Optional[str] = Field(None, description="Filter by email")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum results")
    offset: int = Field(default=0, ge=0, description="Results offset")


class ContactsUploadRequest(BaseModel):
    """Contacts upload request model."""

    contacts: List[ContactRequest] = Field(
        ..., description="List of contacts to upload"
    )
    tags: Optional[List[str]] = Field(None, description="Tags to apply to all contacts")
    overwrite: bool = Field(
        default=False, description="Whether to overwrite existing contacts"
    )


class OutboundRequest(BaseModel):
    """Outbound message request model."""

    contact_id: str = Field(..., description="Target contact identifier")
    template_id: str = Field(..., description="Message template identifier")
    variables: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Template variables"
    )
    scheduled_at: Optional[str] = Field(None, description="Scheduled send time")
    channel: str = Field(default="email", description="Communication channel")


class OutboundBulkRequest(BaseModel):
    """Outbound bulk message request model."""

    contact_ids: List[str] = Field(..., description="Target contact identifiers")
    template_id: str = Field(..., description="Message template identifier")
    variables: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Global template variables"
    )
    contact_variables: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Per-contact variables"
    )
    scheduled_at: Optional[str] = Field(None, description="Scheduled send time")
    channel: str = Field(default="email", description="Communication channel")
    batch_size: int = Field(
        default=100, ge=1, le=1000, description="Batch processing size"
    )


# Response models with data payloads
class InviteData(BaseModel):
    """Invite data model."""

    invite_id: str = Field(..., description="Unique invite identifier")
    email: str = Field(..., description="Invited email address")
    status: str = Field(..., description="Invite status")
    created_at: str = Field(..., description="Invite creation timestamp")
    expires_at: Optional[str] = Field(None, description="Invite expiration timestamp")
    token: Optional[str] = Field(None, description="Invite token")
