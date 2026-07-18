import logging
import os
from pathlib import Path
from typing import List

import httpx
from dotenv import load_dotenv
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)

# Headers được nhận diện để chia chunk
_HEADERS_TO_SPLIT_ON = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
    ("####", "Header 4"),
]

# Nếu một section quá dài (vượt chunk_size), dùng Recursive làm fallback
_MAX_CHUNK_SIZE = 1500
_CHUNK_OVERLAP = 150


class EmbeddingService:
    """Service cho Chunking text (Markdown Header strategy) và gọi Embedding API.

    Chiến lược chunking:
    1. MarkdownHeaderTextSplitter chia tài liệu theo cấu trúc Heading.
       Mỗi chunk mang Metadata {Header 1, Header 2, ...} chỉ rõ phần tài liệu nó thuộc về.
    2. Nếu một section vượt _MAX_CHUNK_SIZE ký tự, RecursiveCharacterTextSplitter
       được dùng để chia nhỏ thêm — đồng thời giữ nguyên prefix Header trong nội dung
       để RAG vẫn biết context.
    3. Với tài liệu KHÔNG có cấu trúc Heading (ví dụ file PDF trần), hệ thống
       tự động fallback sang RecursiveCharacterTextSplitter thuần tuý.
    """

    def __init__(self):
        self.base_url = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "").strip().rstrip("/")
        self.api_key = (
            os.getenv("OPENAI_COMPATIBLE_EMBEDDING_API_KEY")
            or os.getenv("OPENAI_COMPATIBLE_API_KEY", "")
        ).strip()
        self.model = os.getenv(
            "OPENAI_COMPATIBLE_EMBEDDING_MODEL", "text-embedding-3-small"
        ).strip()

        self._header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=_HEADERS_TO_SPLIT_ON,
            strip_headers=False,  # Giữ lại dòng header trong nội dung chunk để AI hiểu context
        )
        self._fallback_splitter = RecursiveCharacterTextSplitter(
            chunk_size=_MAX_CHUNK_SIZE,
            chunk_overlap=_CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def split_text(self, text: str) -> List[str]:
        """Chia text thành chunks theo cấu trúc Markdown Header.

        Quy trình:
        1. Thử chia theo Header (# ## ###).
        2. Nếu 1 section > _MAX_CHUNK_SIZE, chia thêm bằng Recursive.
        3. Nếu tài liệu không có Header nào, fallback ngay sang Recursive.

        Trả về danh sách chuỗi text thuần, mỗi phần tử là 1 chunk sẽ được embed.
        """
        if not text or not text.strip():
            return []

        # Kiểm tra xem tài liệu có chứa Markdown Header không
        has_headers = any(
            line.startswith(("#", "##", "###", "####"))
            for line in text.splitlines()
        )

        if not has_headers:
            logger.info("No Markdown headers detected — falling back to RecursiveCharacterTextSplitter")
            return self._fallback_splitter.split_text(text)

        # Bước 1: Chia theo Header
        header_docs = self._header_splitter.split_text(text)

        if not header_docs:
            logger.warning("MarkdownHeaderTextSplitter returned empty — falling back")
            return self._fallback_splitter.split_text(text)

        # Bước 2: Xây dựng chunk cuối cùng
        final_chunks: List[str] = []
        for doc in header_docs:
            content = doc.page_content.strip()
            if not content:
                continue

            # Gắn breadcrumb Header vào đầu chunk để AI luôn biết context
            metadata = doc.metadata  # e.g. {"Header 1": "Đăng nhập", "Header 2": "Luồng chính"}
            breadcrumb_parts = [v for k, v in sorted(metadata.items()) if v]
            breadcrumb = " > ".join(breadcrumb_parts) if breadcrumb_parts else ""

            # Nếu header chưa có trong content (strip_headers=False thường đã có), bổ sung breadcrumb
            chunk_text = f"[{breadcrumb}]\n{content}" if breadcrumb and breadcrumb not in content else content

            # Bước 3: Nếu section vẫn quá dài, chia thêm bằng Recursive
            if len(chunk_text) > _MAX_CHUNK_SIZE:
                sub_chunks = self._fallback_splitter.split_text(chunk_text)
                final_chunks.extend(sub_chunks)
                logger.debug(
                    "Section '%s' too long (%d chars) — split into %d sub-chunks",
                    breadcrumb,
                    len(chunk_text),
                    len(sub_chunks),
                )
            else:
                final_chunks.append(chunk_text)

        logger.info(
            "MarkdownHeaderTextSplitter produced %d chunks from %d header sections",
            len(final_chunks),
            len(header_docs),
        )
        return final_chunks

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

        # API có thể trả về items không theo đúng thứ tự index — sort lại để an toàn
        items = sorted(items, key=lambda x: x.get("index", 0))
        return [item["embedding"] for item in items]
