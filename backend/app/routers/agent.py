import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage, AIMessage
from app.services.agent.agent_service import get_agent_executor

router = APIRouter(prefix="/agent", tags=["Agent"])
logger = logging.getLogger(__name__)

@router.websocket("/{document_id}")
async def agent_websocket(websocket: WebSocket, document_id: str):
    await websocket.accept()
    
    agent_executor = get_agent_executor(document_id)
    
    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)
            
            user_input = data.get("input", "")
            history_data = data.get("history", [])
            
            chat_history = []
            for msg in history_data:
                role = msg.get("role")
                content = msg.get("content")
                if role == "user":
                    chat_history.append(HumanMessage(content=content))
                elif role == "assistant":
                    chat_history.append(AIMessage(content=content))
                    
            try:
                # Dùng astream_events để lấy cả stream chữ lẫn tool execution
                async for event in agent_executor.astream_events(
                    {"input": user_input, "chat_history": chat_history},
                    version="v2"
                ):
                    kind = event["event"]
                    
                    if kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            await websocket.send_json({
                                "type": "token",
                                "content": content
                            })
                    
                    elif kind == "on_tool_start":
                        await websocket.send_json({
                            "type": "tool_start",
                            "tool_name": event["name"]
                        })
                    
                    elif kind == "on_tool_end":
                        await websocket.send_json({
                            "type": "tool_end",
                            "tool_name": event["name"],
                            "output": str(event["data"].get("output", ""))
                        })
                        
                await websocket.send_json({"type": "end"})
                
            except Exception as e:
                logger.error(f"Agent error: {str(e)}")
                await websocket.send_json({"type": "error", "message": f"Lỗi xử lý AI: {str(e)}"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for document: {document_id}")
    except Exception as e:
        logger.error(f"WebSocket unhandled error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": f"Connection error: {str(e)}"})
            await websocket.close()
        except:
            pass
