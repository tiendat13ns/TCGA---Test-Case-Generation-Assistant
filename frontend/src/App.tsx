import { useState } from "react";
import DocumentList from "./components/DocumentList";
import DocumentUpload from "./components/DocumentUpload";

export type DocumentItem = {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: string;
  uploaded_at: string;
  error_message?: string | null;
  updated_at?: string | null;
};

function App() {
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);

  return (
    <main className="app">
      <h1>AI Test Case Generation Assistant</h1>
      <DocumentUpload onUploadSuccess={setNewUploadedDocuments} />
      <DocumentList newUploadedDocuments={newUploadedDocuments} />
    </main>
  );
}

export default App;
