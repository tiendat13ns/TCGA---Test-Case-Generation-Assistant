import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useAuth } from "../contexts/AuthContext";
import { formatAgentMessage } from "../utils/formatAgentMessage";
import { TCGAAppIcon } from "./TCGALogo";

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

export default function ChatWorkspace({ projectId, selectedDocumentIds, initialMessages = [], onMessagesChange }: ChatWorkspaceProps) {
  const { token, refreshUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0 ? initialMessages : [
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

  const [activeAiMessageId, setActiveAiMessageId] = useState<string | null>(null);

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
    
    // Tạo sẵn một message rỗng cho AI để append dần nội dung stream vào
    const aiMessageId = (Date.now() + 1).toString();
    setActiveAiMessageId(aiMessageId);
    setMessages((prev) => [...prev, { id: aiMessageId, role: "ai", content: "" }]);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      };
      if (token) {
        reqHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/chat/message`, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          document_ids: selectedDocumentIds,
          message: userContent,
          chat_history: historyForApi,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error("Lỗi kết nối API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let aiContent = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          
          // Giữ lại dòng cuối cùng chưa hoàn chỉnh (không có \n ở cuối) vào buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const dataObj = JSON.parse(dataStr);
                if (dataObj.chunk) {
                  aiContent += dataObj.chunk;
                  setMessages((prev) => 
                    prev.map(msg => msg.id === aiMessageId ? { ...msg, content: aiContent } : msg)
                  );
                }
              } catch (err) {
                console.error("Lỗi parse SSE chunk:", err, dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => 
        prev.map(msg => msg.id === aiMessageId ? { ...msg, content: msg.content || "❌ Đã có lỗi xảy ra khi gọi AI Agent. Vui lòng thử lại." } : msg)
      );
    } finally {
      setIsLoading(false);
      setActiveAiMessageId(null);
      refreshUser?.();
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
      <div className="chat-history-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: msg.role === "ai" ? "row" : "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-end",
              gap: msg.role === "ai" ? "10px" : 0,
            }}
          >
            {msg.role === "ai" && (
              <div style={{ flexShrink: 0 }}>
                <TCGAAppIcon size={30} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, flex: msg.role === "ai" ? 1 : "unset" }}>
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
                  <>
                    {msg.content ? (
                      <div className="markdown-body" style={{ width: "100%", overflowX: "auto" }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{formatAgentMessage(msg.content)}</ReactMarkdown>
                      </div>
                    ) : null}
                    {(isLoading && activeAiMessageId === msg.id) && (
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", marginTop: msg.content ? "12px" : "0" }}>
                        <style>
                          {`
                            @keyframes typingBlink {
                              0% { opacity: 0.2; }
                              20% { opacity: 1; }
                              100% { opacity: 0.2; }
                            }
                            .typing-dot {
                              animation: typingBlink 1.4s infinite both;
                              font-size: 16px;
                              font-weight: bold;
                              margin-left: 2px;
                            }
                            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                            .typing-dot:nth-child(4) { animation-delay: 0.6s; }
                          `}
                        </style>
                        <span style={{ fontSize: "13px", fontStyle: "italic" }}>
                          {msg.content ? "Đang tiếp tục xử lý..." : "Đang xử lý"}
                        </span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </div>
                    )}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} style={{ height: "20px", flexShrink: 0 }} />
      </div>

      {/* Bottom Panel (Quick Actions + Input Area with Gradient Overlay) */}
      <div className="chat-bottom-panel">
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
    </div>
  );
}
