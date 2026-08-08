from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class ChatMessage(BaseModel):
    role: Literal["user", "ai", "system"] = Field(..., description="The role of the message sender")
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    document_ids: List[str] = Field(default_factory=list, description="List of document IDs to use as context")
    message: str = Field(..., description="The new user message")
    chat_history: List[ChatMessage] = Field(default_factory=list, description="Previous chat messages")
    stream: bool = Field(default=False, description="If true, response will be streamed as Server-Sent Events")
    user_id: Optional[str] = Field(default=None, description="User ID for credit tracking (optional)")
    project_id: Optional[str] = Field(default=None, description="Project ID — nếu có, tin nhắn sẽ được lưu vào lịch sử chat của project này")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI's response in markdown format")


class ChatHistoryMessage(BaseModel):
    id: str
    role: Literal["user", "ai", "system"]
    content: str
    error: bool = False


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryMessage]
