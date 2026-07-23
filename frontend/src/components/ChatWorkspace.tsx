import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export type Message = {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
};

type ChatWorkspaceProps = {
  projectId: string;
  selectedDocumentIds: string[];
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
};

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export default function ChatWorkspace({ projectId, selectedDocumentIds, initialMessages, onMessagesChange }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages ?? [
      { id: "1", role: "ai", content: "Xin chào! Bạn đã chọn tài liệu, hãy đặt câu hỏi hoặc yêu cầu phân tích." },
    ]
  );
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track whether we're past the initial mount to avoid redundant save on first render
  const isMounted = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist messages to parent whenever they change (after initial mount)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    onMessagesChange?.(messages);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearChat = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat không?")) {
      setMessages([
        { id: Date.now().toString(), role: "ai", content: "Xin chào! Lịch sử đã được làm mới. Hãy đặt câu hỏi hoặc yêu cầu phân tích." },
      ]);
    }
  };

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
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: "28px" }}></div> {/* Placeholder for centering balance */}
        <h3 style={{ margin: 0, fontWeight: 500, color: "var(--text-primary)", fontSize: "14px" }}>TCGA Agent</h3>
        <button 
          onClick={clearChat}
          className="icon-btn-ghost"
          style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)", padding: 0 }}
          title="Xóa lịch sử chat"
        >
          <TrashIcon />
        </button>
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
                maxWidth: msg.role === "user" ? "80%" : "95%",
                width: msg.role === "ai" ? "100%" : "auto",
                padding: msg.role === "ai" ? "16px 20px" : "12px 16px",
                borderRadius: "16px",
                background: msg.role === "user" ? "var(--bg-active)" : "var(--bg-hover)",
                color: "var(--text-primary)",
                border: msg.role === "user" ? "1px solid var(--accent)" : "1px solid var(--border)",
                lineHeight: 1.6,
                fontSize: "14px",
                boxShadow: msg.role === "ai" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {msg.role === "ai" ? (
                <div className="markdown-body" style={{ width: "100%", overflowX: "auto" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
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
        <div ref={messagesEndRef} style={{ height: "20px", flexShrink: 0 }} />
      </div>

      {/* Quick Actions */}
      <div className="chat-quick-actions" style={{ padding: "8px 16px 12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
