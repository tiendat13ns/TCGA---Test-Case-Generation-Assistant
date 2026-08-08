import statistics

from app.services.documents.extractors.base import BaseExtractor

# Dòng được coi là heading nếu cỡ chữ trung bình lớn hơn cỡ chữ "thân bài" (body text)
# theo các ngưỡng dưới đây (ratio = size / body_size), thử từ mức to nhất trở xuống.
_HEADING_SIZE_RATIOS = [
    (1.4, "#"),
    (1.2, "##"),
    (1.08, "###"),
]
_HEADING_MAX_CHARS = 100


class PdfExtractor(BaseExtractor):
    """Trích xuất text từ PDF, cố gắng suy luận cấu trúc Heading từ cỡ chữ (font size).

    PDF không có style "Heading" tường minh như DOCX (xem docx_extractor.py), nên
    heading ở đây được đoán bằng heuristic: dòng có cỡ chữ trung bình lớn hơn đáng kể
    so với cỡ chữ phổ biến nhất (body text) của toàn tài liệu, và đủ ngắn để giống
    tiêu đề chứ không phải một đoạn văn. Heuristic này không hoàn hảo (PDF nhiều cột,
    scan ảnh, hoặc font size đồng nhất sẽ không có heading nào được suy ra — khi đó
    coi như quay lại hành vi cũ), nhưng cho phép MarkdownHeaderTextSplitter
    (embedding_service.py) chia chunk theo section thay vì luôn phải cắt thô theo
    ký tự như trước.
    """

    def extract(self, file_path: str) -> str:
        try:
            import pdfplumber
        except ImportError as exc:
            raise RuntimeError("pdfplumber is required to extract PDF files") from exc

        try:
            with pdfplumber.open(file_path) as pdf:
                pages_lines = [self._extract_page_lines(page) for page in pdf.pages]
        except Exception as exc:
            raise ValueError(f"Could not read PDF file: {exc}") from exc

        all_lines = [line for page_lines in pages_lines for line in page_lines]
        if not all_lines:
            return ""

        body_size = self._estimate_body_size(all_lines)

        pages_text = []
        for page_lines in pages_lines:
            if not page_lines:
                continue
            rendered = [self._render_line(text, size, body_size) for text, size in page_lines]
            pages_text.append("\n".join(rendered))

        return "\n\n".join(pages_text).strip()

    @staticmethod
    def _extract_page_lines(page) -> list[tuple[str, float]]:
        """Nhóm các ký tự trong 1 trang PDF thành từng dòng (theo tọa độ 'top'),
        trả về list (text, avg_font_size) cho mỗi dòng."""
        chars = page.chars
        if not chars:
            # Trang không có char-level info (ví dụ PDF scan) — dùng extract_text() thô,
            # không suy luận heading được (size=0.0 sẽ bị bỏ qua ở _render_line).
            text = (page.extract_text() or "").strip()
            return [(line.strip(), 0.0) for line in text.splitlines() if line.strip()]

        chars_sorted = sorted(chars, key=lambda c: (round(c["top"], 1), c["x0"]))

        lines: list[list[dict]] = []
        current_line: list[dict] = []
        current_top: float | None = None

        for ch in chars_sorted:
            top = round(ch["top"], 1)
            if current_top is None or abs(top - current_top) <= 2.0:
                current_line.append(ch)
                current_top = top if current_top is None else current_top
            else:
                lines.append(current_line)
                current_line = [ch]
                current_top = top
        if current_line:
            lines.append(current_line)

        result: list[tuple[str, float]] = []
        for line in lines:
            text = "".join(c["text"] for c in line).strip()
            if not text:
                continue
            avg_size = sum(c.get("size", 0.0) for c in line) / len(line)
            result.append((text, avg_size))
        return result

    @staticmethod
    def _estimate_body_size(all_lines: list[tuple[str, float]]) -> float:
        """Body size = cỡ chữ phổ biến nhất (mode) trong toàn tài liệu — dùng làm mốc
        so sánh để suy ra dòng nào là heading."""
        sizes = [round(size) for _text, size in all_lines if size > 0]
        if not sizes:
            return 0.0
        try:
            return statistics.mode(sizes)
        except statistics.StatisticsError:
            return statistics.median(sizes)

    @staticmethod
    def _render_line(text: str, size: float, body_size: float) -> str:
        if body_size <= 0 or len(text) > _HEADING_MAX_CHARS:
            return text
        ratio = size / body_size
        for min_ratio, prefix in _HEADING_SIZE_RATIOS:
            if ratio >= min_ratio:
                return f"{prefix} {text}"
        return text
