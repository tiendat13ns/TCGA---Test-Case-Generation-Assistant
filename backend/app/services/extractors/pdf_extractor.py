from app.services.extractors.base import BaseExtractor


class PdfExtractor(BaseExtractor):
    def extract(self, file_path: str) -> str:
        try:
            import pdfplumber
        except ImportError as exc:
            raise RuntimeError("pdfplumber is required to extract PDF files") from exc

        pages: list[str] = []

        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    if text.strip():
                        pages.append(text.strip())
        except Exception as exc:
            raise ValueError(f"Could not read PDF file: {exc}") from exc

        return "\n\n".join(pages).strip()
