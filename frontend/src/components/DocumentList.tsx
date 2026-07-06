import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { DocumentItem } from "../App";

const API_URL = "http://localhost:8000/api/documents";

type DocumentListProps = {
  newUploadedDocuments: DocumentItem[];
};

type Filters = {
  filename: string;
  type: string;
  minSizeKb: string;
  maxSizeKb: string;
  status: string;
  timeOrder: string;
};

const defaultFilters: Filters = {
  filename: "",
  type: "",
  minSizeKb: "",
  maxSizeKb: "",
  status: "",
  timeOrder: "newest",
};

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentList({ newUploadedDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(API_URL);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail || "Could not load documents.");
        }

        setDocuments(data);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Cannot connect to backend. Please make sure it is running.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  useEffect(() => {
    if (newUploadedDocuments.length === 0) {
      return;
    }

    setDocuments((currentDocuments) => {
      const currentIds = new Set(currentDocuments.map((document) => document.id));
      const documentsToAdd = newUploadedDocuments.filter(
        (document) => !currentIds.has(document.id),
      );

      return [...documentsToAdd, ...currentDocuments];
    });
  }, [newUploadedDocuments]);

  const fileTypes = useMemo(
    () => Array.from(new Set(documents.map((document) => document.file_type))).sort(),
    [documents],
  );

  const statuses = useMemo(
    () => Array.from(new Set(documents.map((document) => document.status))).sort(),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const minSize = filters.minSizeKb ? Number(filters.minSizeKb) * 1024 : null;
    const maxSize = filters.maxSizeKb ? Number(filters.maxSizeKb) * 1024 : null;

    return documents
      .filter((document) => {
        const matchesFilename = document.original_filename
          .toLowerCase()
          .includes(filters.filename.toLowerCase());
        const matchesType = !filters.type || document.file_type === filters.type;
        const matchesStatus = !filters.status || document.status === filters.status;
        const matchesMinSize = minSize === null || document.file_size >= minSize;
        const matchesMaxSize = maxSize === null || document.file_size <= maxSize;

        return (
          matchesFilename &&
          matchesType &&
          matchesStatus &&
          matchesMinSize &&
          matchesMaxSize
        );
      })
      .sort((firstDocument, secondDocument) => {
        const firstTime = new Date(firstDocument.uploaded_at).getTime();
        const secondTime = new Date(secondDocument.uploaded_at).getTime();

        return filters.timeOrder === "oldest"
          ? firstTime - secondTime
          : secondTime - firstTime;
      });
  }, [documents, filters]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const clearUploadHistory = async () => {
    const confirmed = window.confirm("Clear all uploaded document history?");

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Could not clear upload history.");
      }

      setDocuments([]);
      resetFilters();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="section">
      <div className="section-header">
        <h2>Uploaded Documents</h2>
        <div className="header-actions">
          <button type="button" onClick={() => setShowFilters((current) => !current)}>
            Filter
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={isClearing || documents.length === 0}
            onClick={clearUploadHistory}
          >
            {isClearing ? "Clearing..." : "Clear History"}
          </button>
        </div>
      </div>
      {showFilters && (
        <div className="filters">
          <label>
            Filename
            <input
              type="text"
              name="filename"
              value={filters.filename}
              onChange={handleFilterChange}
              placeholder="Search filename"
            />
          </label>
          <label>
            Type
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All</option>
              {fileTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Min size (KB)
            <input
              type="number"
              min="0"
              name="minSizeKb"
              value={filters.minSizeKb}
              onChange={handleFilterChange}
            />
          </label>
          <label>
            Max size (KB)
            <input
              type="number"
              min="0"
              name="maxSizeKb"
              value={filters.maxSizeKb}
              onChange={handleFilterChange}
            />
          </label>
          <label>
            Status
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time
            <select name="timeOrder" value={filters.timeOrder} onChange={handleFilterChange}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <button type="button" onClick={resetFilters}>
            Clear
          </button>
        </div>
      )}
      {isLoading && <p>Loading...</p>}
      {message && <p className="message error">{message}</p>}
      {!isLoading && !message && documents.length === 0 && <p>No uploaded files yet.</p>}
      {!isLoading && !message && documents.length > 0 && filteredDocuments.length === 0 && (
        <p>No files match the current filters.</p>
      )}
      {documents.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Original filename</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
              <th>Uploaded at</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((document) => (
              <tr key={document.id}>
                <td>{document.original_filename}</td>
                <td>{document.file_type}</td>
                <td>{formatFileSize(document.file_size)}</td>
                <td>{document.status}</td>
                <td>{document.uploaded_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default DocumentList;
