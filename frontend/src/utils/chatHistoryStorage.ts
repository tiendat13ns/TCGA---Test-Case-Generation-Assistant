import { Message } from "../components/ChatWorkspace";

const CHAT_STORAGE_KEY = (projectId: string) => `tcga-chat-${projectId}`;

export function loadChatHistory(projectId: string): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY(projectId));
    if (raw) return JSON.parse(raw) as Message[];
  } catch {
    // ignore parse errors
  }
  return [
    { id: "1", role: "ai", content: `Xin chào! Bạn đã chọn tài liệu, hãy đặt câu hỏi hoặc yêu cầu phân tích.` },
  ];
}

export function saveChatHistory(projectId: string, messages: Message[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY(projectId), JSON.stringify(messages));
  } catch {
    // quota exceeded or private mode — silent fail
  }
}
