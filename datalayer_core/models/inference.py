# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Inference request/response models shared by AI inference services."""

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message in OpenAI-compatible format."""

    role: str = Field(..., description="Message role, e.g. system/user/assistant/tool")
    content: Optional[str] = Field(None, description="Message content")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(
        None, description="Tool calls emitted by assistant messages"
    )
    tool_call_id: Optional[str] = Field(
        None, description="Tool call identifier for tool role messages"
    )
    name: Optional[str] = Field(None, description="Optional message name")


class ChatRequest(BaseModel):
    """Request body for chat completions."""

    model: Optional[str] = Field(None, description="Target model identifier")
    messages: List[ChatMessage] = Field(
        ..., description="Conversation messages in chronological order"
    )
    temperature: Optional[float] = Field(1.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, description="Maximum output tokens")
    stream: bool = Field(False, description="Enable SSE streaming response")
    tools: Optional[List[Dict[str, Any]]] = Field(
        None, description="Tool definitions for tool calling"
    )
    tool_choice: Optional[Any] = Field(None, description="Tool-choice strategy")
    functions: Optional[List[Dict[str, Any]]] = Field(
        None, description="Legacy function-calling definitions"
    )
    function_call: Optional[Any] = Field(
        None, description="Legacy function-call selection strategy"
    )
    parallel_tool_calls: Optional[bool] = Field(
        None, description="Whether model can invoke tools in parallel"
    )


class CompletionRequest(BaseModel):
    """Request body for text completions."""

    model: Optional[str] = Field(None, description="Target model identifier")
    prompt: str = Field(..., description="Prompt text")
    temperature: Optional[float] = Field(1.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, description="Maximum output tokens")
    stop: Optional[Union[str, List[str]]] = Field(
        None, description="Stop sequence(s)"
    )
    stream: bool = Field(False, description="Enable SSE streaming response")


class ChatResponseData(BaseModel):
    """Response payload for chat completions."""

    response: Optional[str] = Field(None, description="Backward-compatible text output")
    message: Optional[Dict[str, Any]] = Field(
        None, description="Primary assistant message"
    )
    choices: Optional[List[Dict[str, Any]]] = Field(
        None, description="OpenAI-compatible choices payload"
    )
    model: Optional[str] = Field(None, description="Resolved model identifier")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage metadata")


class CompletionResponseData(BaseModel):
    """Response payload for text completions."""

    response: Optional[str] = Field(None, description="Generated text")
    model: Optional[str] = Field(None, description="Resolved model identifier")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage metadata")
