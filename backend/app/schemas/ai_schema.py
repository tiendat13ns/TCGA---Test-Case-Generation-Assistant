from pydantic import BaseModel


class AITestRequest(BaseModel):
    prompt: str


class AITestResponse(BaseModel):
    response: str


class AIHealthResponse(BaseModel):
    provider: str
    model: str
    status: str
