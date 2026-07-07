from pathlib import Path

from app.services.extractors.base import BaseExtractor


class TxtExtractor(BaseExtractor):
    encodings = ("utf-8", "utf-8-sig", "latin-1")

    def extract(self, file_path: str) -> str:
        path = Path(file_path)

        for encoding in self.encodings:
            try:
                return path.read_text(encoding=encoding).strip()
            except UnicodeDecodeError:
                continue

        raise ValueError("Could not decode text file")
