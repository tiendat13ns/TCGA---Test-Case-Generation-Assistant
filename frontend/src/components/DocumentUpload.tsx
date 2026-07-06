import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { DocumentItem } from "../App";

const API_URL = "http://localhost:8000/api/documents/upload";

type DocumentUploadProps = {
  onUploadSuccess: (documents: DocumentItem[]) => void;
};

function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setMessage("");
    setIsError(false);
  };

  const removeSelectedFile = (fileIndex: number) => {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== fileIndex),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setIsError(true);
      setMessage("Please select at least one file before uploading.");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setIsUploading(true);
    setIsError(false);
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Upload failed.");
      }

      const uploadedDocuments = Array.isArray(data) ? data : [];
      const uploadedCount = uploadedDocuments.length;
      setMessage(`Uploaded successfully: ${uploadedCount} file${uploadedCount === 1 ? "" : "s"}.`);
      setSelectedFiles([]);
      formRef.current?.reset();
      onUploadSuccess(uploadedDocuments);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className="section">
      <h2>Upload Document</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="upload-form">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt,.md,.xlsx,.csv,.dbml,.zip"
          multiple
        />
        <button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h3>Selected Files</h3>
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedFiles.map((file, index) => {
                const extension = file.name.split(".").pop() || "";

                return (
                  <tr key={`${file.name}-${file.lastModified}`}>
                    <td>{file.name}</td>
                    <td>{extension}</td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => removeSelectedFile(index)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {message && <p className={isError ? "message error" : "message success"}>{message}</p>}
    </section>
  );
}

export default DocumentUpload;
