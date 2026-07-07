from app.services.extractors.base import BaseExtractor


class DocxExtractor(BaseExtractor):
    def extract(self, file_path: str) -> str:
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("python-docx is required to extract DOCX files") from exc

        try:
            document = Document(file_path)
        except Exception as exc:
            raise ValueError(f"Could not read DOCX file: {exc}") from exc

        parts: list[str] = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if text:
                parts.append(text)

        for table in document.tables:
            for row in table.rows:
                cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                if any(cells):
                    parts.append(" | ".join(cells))

        return "\n".join(parts).strip()
