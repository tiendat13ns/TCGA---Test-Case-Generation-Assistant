/**
 * Hậu xử lý (post-process) văn bản thô do AI Agent trả về thành Markdown có định dạng:
 * - Các dòng tiêu đề dạng "1. Tên mục" -> heading (in đậm, tách dòng).
 * - Nhãn đứng trước dấu ":" trong các mục danh sách ("- Label: nội dung") -> in đậm phần nhãn.
 *
 * Cách tiếp cận này dùng thuật toán heuristic cố định thay vì yêu cầu AI tự sinh markdown,
 * vì output của AI không ổn định giữa các lần trả lời.
 */
export function formatAgentMessage(raw: string): string {
  if (!raw) return raw;

  const lines = raw.split("\n");
  const output: string[] = [];

  for (const line of lines) {
    // Chặn thanh ngang (---, ***, ___ kiểu CommonMark thematic break) — SYSTEM_PROMPT đã
    // yêu cầu model không dùng nhưng không phải lúc nào cũng tuân thủ, nên lọc thẳng ở
    // đây để đảm bảo chắc chắn 100% thay vì phụ thuộc hoàn toàn vào việc model có nghe lời.
    const collapsed = line.trim().replace(/\s+/g, "");
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(collapsed)) {
      continue;
    }

    const listItemMatch = line.match(/^(\s*)([-+])\s+(.*)$/);
    if (listItemMatch) {
      const [, indent, marker, content] = listItemMatch;
      output.push(`${indent}${marker} ${boldListLabel(content)}`);
      continue;
    }

    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(\d{1,2})\.\s+(.+)$/);
    if (headingMatch && isLikelyHeading(headingMatch[2])) {
      output.push(`#### ${trimmed}`);
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

function isLikelyHeading(text: string): boolean {
  if (text.includes(":")) return false;
  if (text.length > 70) return false;
  if (!/^[a-zà-ỹ]/i.test(text)) return false;
  return true;
}

function boldListLabel(content: string): string {
  if (content.includes("**")) return content;

  const colonIdx = content.indexOf(":");
  if (colonIdx === -1 || colonIdx > 60) return content;

  const label = content.slice(0, colonIdx);
  const rest = content.slice(colonIdx + 1);

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return content;
  if (/^\d+$/.test(trimmedLabel)) return content; // avoid bolding clock-like "10:30"
  if (/https?$/i.test(trimmedLabel)) return content; // avoid bolding "http:" in URLs

  return `**${label}:**${rest}`;
}
