import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
};

type ChatWorkspaceProps = {
  projectId: string;
  selectedDocumentIds: string[];
};

export default function ChatWorkspace({ projectId, selectedDocumentIds }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Xin chào! Bạn đã chọn tài liệu, hãy đặt câu hỏi hoặc yêu cầu phân tích.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || selectedDocumentIds.length === 0) return;
    
    // Add user message
    const userContent = text.trim();
    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: userContent };
    
    // Build chat history for the API
    const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);
    setInputValue("");
    
    try {
      const response = await fetch("http://localhost:8000/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_ids: selectedDocumentIds,
          message: userContent,
          chat_history: historyForApi
        })
      });
      
      if (!response.ok) {
        throw new Error("Lỗi kết nối API");
      }
      
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: data.response },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: "❌ Đã có lỗi xảy ra khi gọi AI Agent. Vui lòng thử lại." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%", background: "var(--bg-elevated)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h3 style={{ margin: 0, fontWeight: 500, color: "var(--text-primary)" }}>Cuộc trò chuyện</h3>
      </div>
      
      {/* Chat History */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" && (
              <div style={{ marginBottom: "4px", fontSize: "12px", color: "var(--accent)", fontWeight: 500 }}>
                TCGA Agent
              </div>
            )}
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: "16px",
                background: msg.role === "user" ? "var(--bg-active)" : "var(--bg-hover)",
                color: "var(--text-primary)",
                border: msg.role === "user" ? "1px solid var(--accent)" : "1px solid var(--border)",
                lineHeight: 1.5,
                fontSize: "14px",
              }}
            >
              {msg.role === "ai" ? (
                <div className="markdown-body" style={{ fontSize: "14px" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ marginBottom: "4px", fontSize: "12px", color: "var(--accent)", fontWeight: 500 }}>
              TCGA Agent
            </div>
            <div style={{ padding: "12px 16px", borderRadius: "16px", background: "var(--bg-hover)", color: "var(--text-secondary)", fontSize: "14px", border: "1px solid var(--border)" }}>
              Đang suy nghĩ...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => sendMessage("Phân tích tài liệu tổng quan, tóm tắt các tính năng chính và luồng nghiệp vụ.")}
          className="btn btn-secondary btn-xs"
          disabled={selectedDocumentIds.length === 0 || isLoading}
        >
          Phân tích tài liệu tổng quan
        </button>
        <button
          onClick={() => sendMessage("Hãy tạo Requirement cho các tài liệu này. Đảm bảo tuân thủ đúng prompt trích xuất requirement (phân tích toàn bộ các file được cung cấp).")}
          className="btn btn-secondary btn-xs"
          disabled={selectedDocumentIds.length === 0 || isLoading}
        >
          Tạo Requirement
        </button>
        <button
          onClick={() => sendMessage("Hãy tìm kiếm các requirement của tài liệu này (hoặc tạo mới nếu chưa có), sau đó tạo Test Case cho chúng (tuân thủ prompt thiết kế test case).")}
          className="btn btn-secondary btn-xs"
          disabled={selectedDocumentIds.length === 0 || isLoading}
        >
          Tạo Test Case
        </button>
      </div>

      {/* Input Area */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "10px", background: "var(--bg-hover)", borderRadius: "24px", padding: "4px", border: "1px solid var(--border)" }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage(inputValue);
            }}
            placeholder={selectedDocumentIds.length > 0 ? "Yêu cầu sinh test case hoặc phân tích tài liệu..." : "Vui lòng chọn tài liệu ở cột phải trước khi bắt đầu..."}
            disabled={selectedDocumentIds.length === 0 || isLoading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "8px 16px",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || selectedDocumentIds.length === 0 || isLoading}
            style={{
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "20px",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: (!inputValue.trim() || selectedDocumentIds.length === 0 || isLoading) ? "not-allowed" : "pointer",
              opacity: (!inputValue.trim() || selectedDocumentIds.length === 0 || isLoading) ? 0.5 : 1,
            }}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
