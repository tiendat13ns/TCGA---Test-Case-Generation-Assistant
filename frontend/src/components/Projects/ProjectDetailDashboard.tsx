import { useState } from "react";
import { Project } from "./ProjectManager";
import DocumentUpload from "../Documents/DocumentUpload";
import DocumentList from "../Documents/DocumentList";
import RequirementViewer, { GenerateRequirementsResponse } from "../RequirementViewer";
import SideDrawer from "../SideDrawer";
import ChatWorkspace, { Message } from "../ChatWorkspace";
import DocumentContextSidebar from "../Documents/DocumentContextSidebar";
import { DocumentItem } from "../../App";

type ProjectDetailDashboardProps = {
  project: Project;
  chatMessages: Message[];
  onChatMessagesChange: (messages: Message[]) => void;
};

export default function ProjectDetailDashboard({ 
  project, 
  chatMessages, 
  onChatMessagesChange 
}: ProjectDetailDashboardProps) {
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);
  
  // State for toggling views
  const [activeTab, setActiveTab] = useState<"dashboard" | "agent">("dashboard");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  
  const [activeRequirementData, setActiveRequirementData] = useState<{
    reqs: GenerateRequirementsResponse;
    doc: DocumentItem | null;
  } | null>(null);

  const handleViewRequirements = (reqs: GenerateRequirementsResponse, doc: DocumentItem) => {
    setActiveRequirementData({ reqs, doc });
  };

  const handleCloseRequirements = () => {
    setActiveRequirementData(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Project Header */}
      <div style={{ 
        padding: "24px 32px", 
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        backgroundColor: "var(--bg-surface)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>{project.name}</h2>
            <span className="badge badge-completed">Active</span>
          </div>
          {project.description && (
            <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
              {project.description}
            </p>
          )}
        </div>
        
        {activeTab === "dashboard" ? (
          <button 
            className="btn btn-primary"
            style={{ padding: "8px 16px", borderRadius: "20px", display: "flex", gap: "8px", alignItems: "center" }}
            onClick={() => setActiveTab("agent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Work with Agent
          </button>
        ) : (
          <button 
            className="btn btn-secondary"
            style={{ padding: "8px 16px", borderRadius: "20px", display: "flex", gap: "8px", alignItems: "center" }}
            onClick={() => setActiveTab("dashboard")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Manage Documents
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "dashboard" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px", backgroundColor: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            <DocumentUpload
              projectId={project.id}
              onUploadSuccess={setNewUploadedDocuments}
            />
            <DocumentList
              projectId={project.id}
              newUploadedDocuments={newUploadedDocuments}
              onViewRequirements={handleViewRequirements}
            />
          </div>
        </div>
      ) : (
        <div className="workspace-content-grid" style={{ flex: 1, minHeight: 0 }}>
          {/* Middle column: Chat Workspace */}
          <ChatWorkspace
            key={project.id}
            projectId={project.id}
            selectedDocumentIds={selectedDocumentIds}
            initialMessages={chatMessages}
            onMessagesChange={onChatMessagesChange}
          />
          {/* Right sidebar: Document Context */}
          <div className="workspace-right-sidebar">
            <DocumentUpload
              projectId={project.id}
              onUploadSuccess={setNewUploadedDocuments}
            />
            <DocumentContextSidebar
              projectId={project.id}
              newUploadedDocuments={newUploadedDocuments}
              selectedDocumentIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          </div>
        </div>
      )}

      {/* Side Drawer for Requirement Details */}
      <SideDrawer
        isOpen={!!activeRequirementData}
        onClose={handleCloseRequirements}
        title="Requirements & Test Cases"
        width="65vw"
      >
        {activeRequirementData && (
          <RequirementViewer
            requirements={activeRequirementData.reqs}
            document={activeRequirementData.doc}
            onClose={handleCloseRequirements}
            onRequirementsUpdate={(updatedReqs) => setActiveRequirementData(prev => prev ? { ...prev, reqs: updatedReqs } : null)}
          />
        )}
      </SideDrawer>
      
    </div>
  );
}
