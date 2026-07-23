from fastapi import APIRouter, HTTPException
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message

router = APIRouter()

@router.post("/message", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint for stateless chat.
    Takes document_ids, the latest message, and chat history.
    Runs RAG based on the message and documents, then generates a response.
    """
    try:
        response = await process_chat_message(request)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
