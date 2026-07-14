import logging
import os
from pathlib import Path
from typing import List

import httpx
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service cho Chunking text và gọi Embedding API."""

    def __init__(self):
        self.base_url = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "").strip().rstrip("/")
        self.api_key = (
            os.getenv("OPENAI_COMPATIBLE_EMBEDDING_API_KEY")
            or os.getenv("OPENAI_COMPATIBLE_API_KEY", "")
        ).strip()
        self.model = os.getenv(
            "OPENAI_COMPATIBLE_EMBEDDING_MODEL", "text-embedding-3-small"
        ).strip()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def split_text(self, text: str) -> List[str]:
        """Chia text thành các chunks với overlap."""
        if not text or not text.strip():
            return []
        return self.text_splitter.split_text(text)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Gọi API /embeddings để lấy vector. Trả về list theo đúng thứ tự input."""
        if not texts:
            return []

        # Chỉ định dimensions=1536 để hỗ trợ cả text-embedding-3-large
        # vì bảng document_chunks của chúng ta cấu hình Vector(1536)
        payload = {"model": self.model, "input": texts, "dimensions": 1536}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            logger.error(
                "Embedding API error %d: %s", response.status_code, response.text
            )
            raise RuntimeError(
                f"Embedding API failed ({response.status_code}): {response.text}"
            )

        data = response.json()
        if "error" in data:
            error_msg = data["error"].get("message", str(data["error"]))
            logger.error("Embedding API returned error in body: %s", error_msg)
            raise RuntimeError(f"Embedding API error: {error_msg}")

        items = data.get("data", [])
        if not items:
            logger.error("Embedding API returned empty data. Raw response: %s", data)
            print(f"!!! RAW RESPONSE FROM VILAO: {data}")

        # API có thể trả về items không theo đúng thứ tự index — sort lại để an toàn
        items = sorted(items, key=lambda x: x.get("index", 0))
        return [item["embedding"] for item in items]
