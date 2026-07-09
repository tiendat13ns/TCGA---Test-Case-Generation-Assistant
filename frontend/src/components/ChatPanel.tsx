import { useEffect, useRef, useState } from "react";

type ChatPanelProps = {
  documentId: string;
  onDataGenerated: () => void;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
  isStreaming?: boolean;
};

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const SpinnerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
  </svg>
);

export default function ChatPanel({ documentId, onDataGenerated }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-connect when document changes
  useEffect(() => {
    setMessages([]);
    setCurrentTool(null);
    setIsProcessing(false);
    
    const ws = new WebSocket(`ws://localhost:8000/agent/${documentId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected for", documentId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "token") {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && lastMsg.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...lastMsg, content: lastMsg.content + data.content };
            return updated;
          } else {
            return [...prev, { id: Date.now().toString(), role: "assistant", content: data.content, isStreaming: true }];
          }
        });
      } else if (data.type === "tool_start") {
        setCurrentTool(data.tool_name);
      } else if (data.type === "tool_end") {
        if (data.tool_name?.includes("generate_and_save")) {
          onDataGenerated();
        }
        setCurrentTool(null);
      } else if (data.type === "end" || data.type === "error") {
        setIsProcessing(false);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.isStreaming) last.isStreaming = false;
          return updated;
        });
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTool]);

  const handleSend = () => {
    if (!input.trim() || isProcessing || !wsRef.current) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsProcessing(true);

    const historyForAgent = newMessages.map(m => ({ role: m.role, content: m.content }));
    wsRef.current.send(JSON.stringify({ input: userMsg.content, history: historyForAgent.slice(0, -1) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <h2 className="panel-title">Chat</h2>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: "8px",
              background: msg.role === "user" ? "var(--accent-dim)" : "var(--bg-hover)",
              color: msg.role === "user" ? "var(--accent)" : "var(--text-primary)",
              border: msg.role === "user" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border)",
              fontSize: "14px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap"
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {currentTool && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px", borderRadius: "6px",
              background: "var(--bg-hover)", color: "var(--text-secondary)",
              border: "1px solid var(--border)", fontSize: "13px"
            }}>
              <SpinnerIcon />
              Đang thực thi: {currentTool}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Bạn cần hỗ trợ gì với tài liệu này?"
            disabled={isProcessing}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "6px",
              border: "1px solid var(--border)", background: "var(--bg)",
              color: "var(--text-primary)", outline: "none",
              opacity: isProcessing ? 0.6 : 1
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            style={{
              padding: "0 16px", borderRadius: "6px",
              background: "var(--accent)", color: "#fff",
              border: "none", cursor: input.trim() && !isProcessing ? "pointer" : "not-allowed",
              opacity: input.trim() && !isProcessing ? 1 : 0.6,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
