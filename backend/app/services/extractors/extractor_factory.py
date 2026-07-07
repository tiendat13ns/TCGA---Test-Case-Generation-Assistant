from pathlib import Path

from app.services.extractors.base import BaseExtractor
from app.services.extractors.docx_extractor import DocxExtractor
from app.services.extractors.excel_extractor import ExcelExtractor
from app.services.extractors.md_extractor import MarkdownExtractor
from app.services.extractors.pdf_extractor import PdfExtractor
from app.services.extractors.txt_extractor import TxtExtractor


class ExtractorFactory:
    _extractors: dict[str, type[BaseExtractor]] = {
        "pdf": PdfExtractor,
        "docx": DocxExtractor,
        "txt": TxtExtractor,
        "md": MarkdownExtractor,
        "xlsx": ExcelExtractor,
    }

    @classmethod
    def get_extractor(cls, file_path: str) -> BaseExtractor:
        extension = Path(file_path).suffix.lower().lstrip(".")
        extractor_class = cls._extractors.get(extension)

        if extractor_class is None:
            raise ValueError(f"Unsupported file type for text extraction: {extension}")

        return extractor_class()
