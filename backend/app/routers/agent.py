import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import AIMessage, HumanMessage

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

            chat_history = [
                HumanMessage(content=m["content"])
                if m.get("role") == "user"
                else AIMessage(content=m["content"])
                for m in history_data
            ]

            try:
                async for event in agent_executor.astream_events(
                    {"input": user_input, "chat_history": chat_history},
                    version="v2",
                ):
                    kind = event["event"]

                    if kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            await websocket.send_json({"type": "token", "content": content})

                    elif kind == "on_tool_start":
                        await websocket.send_json(
                            {"type": "tool_start", "tool_name": event["name"]}
                        )

                    elif kind == "on_tool_end":
                        await websocket.send_json(
                            {
                                "type": "tool_end",
                                "tool_name": event["name"],
                                "output": str(event["data"].get("output", "")),
                            }
                        )

                await websocket.send_json({"type": "end"})

            except Exception as exc:
                logger.error("Agent processing error: %s", str(exc))
                await websocket.send_json(
                    {"type": "error", "message": f"Lỗi xử lý AI: {str(exc)}"}
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for document: %s", document_id)
    except Exception as exc:
        logger.error("WebSocket unhandled error: %s", str(exc))
        try:
            await websocket.send_json(
                {"type": "error", "message": f"Connection error: {str(exc)}"}
            )
            await websocket.close()
        except Exception:
            pass
