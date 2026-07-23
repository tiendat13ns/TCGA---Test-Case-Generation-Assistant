from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class ChatMessage(BaseModel):
    role: Literal["user", "ai", "system"] = Field(..., description="The role of the message sender")
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    document_ids: List[str] = Field(default_factory=list, description="List of document IDs to use as context")
    message: str = Field(..., description="The new user message")
    chat_history: List[ChatMessage] = Field(default_factory=list, description="Previous chat messages")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI's response in markdown format")
