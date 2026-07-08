import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { DocumentItem } from "../App";

const API_URL = "http://localhost:8000/api/documents";
const API_V1_DOCUMENTS_URL = "http://localhost:8000/api/v1/documents";
const API_V1_REQUIREMENTS_URL = "http://localhost:8000/api/v1/requirements";

type DocumentListProps = {
  newUploadedDocuments: DocumentItem[];
};

type DocumentDetail = DocumentItem & {
  text_length: number;
  preview: string | null;
};

type RequirementItem = {
  id: string;
  title: string;
  description: string;
  functional_requirement: string | null;
  validation_rule: string[] | null;
  permission: string[] | null;
  workflow: string[] | null;
  state: string[] | null;
  error_handling: string[] | null;
  module_name: string | null;
  feature_name: string | null;
  actor: string | null;
  business_rules: string[] | null;
  inputs: string[] | null;
  outputs: string[] | null;
  preconditions: string[] | null;
  validation_rules: string[] | null;
  exception_flows: string[] | null;
  source_reference: string | null;
  confidence_score: number | null;
  status: string;
  version: number;
};

type GenerateRequirementsResponse = {
  document_id: string;
  project_id: string | null;
  total_requirements: number;
  requirements: RequirementItem[];
};

type TestCaseItem = {
  id: string;
  requirement_id: string;
  document_id: string | null;
  title: string;
  scenario: string | null;
  preconditions: string | null;
  test_steps: string[] | null;
  test_data: string | null;
  expected_result: string;
  priority: string;
  severity: string | null;
  test_type: string | null;
  automation_candidate: boolean;
  execution_type: string;
  status: string;
  version: number;
};

type GenerateTestCasesResponse = {
  requirement_id: string;
  document_id: string | null;
  total_test_cases: number;
  test_cases: TestCaseItem[];
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

function RequirementTextList({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) {
    return <p className="requirement-empty">-</p>;
  }

  return (
    <ul className="requirement-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function DocumentList({ newUploadedDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [generatingRequirementsId, setGeneratingRequirementsId] = useState<string | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<DocumentDetail | null>(null);
  const [generatedRequirements, setGeneratedRequirements] =
    useState<GenerateRequirementsResponse | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  // Test case state: requirementId → test cases response
  const [testCasesMap, setTestCasesMap] = useState<Record<string, GenerateTestCasesResponse>>({});
  const [generatingTestCasesId, setGeneratingTestCasesId] = useState<string | null>(null);
  const [expandedTestCasesId, setExpandedTestCasesId] = useState<string | null>(null);

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

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((id) => id !== documentId)
        : [...currentIds, documentId],
    );
  };

  const toggleAllVisibleDocuments = () => {
    const visibleIds = filteredDocuments.map((document) => document.id);
    const allVisibleSelected = visibleIds.every((id) => selectedDocumentIds.includes(id));

    setSelectedDocumentIds((currentIds) => {
      if (allVisibleSelected) {
        return currentIds.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...visibleIds]));
    });
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
      setSelectedDocumentIds([]);
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

  const deleteSelectedDocuments = async () => {
    if (selectedDocumentIds.length === 0) {
      setMessage("Please select at least one file to delete.");
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedDocumentIds.length} selected file(s)?`);

    if (!confirmed) {
      return;
    }

    setIsDeletingSelected(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/selected`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedDocumentIds }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Could not delete selected documents.");
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => !selectedDocumentIds.includes(document.id)),
      );
      setSelectedDocumentDetail((currentDetail) =>
        currentDetail && selectedDocumentIds.includes(currentDetail.id) ? null : currentDetail,
      );
      setGeneratedRequirements((currentRequirements) =>
        currentRequirements && selectedDocumentIds.includes(currentRequirements.document_id)
          ? null
          : currentRequirements,
      );
      setSelectedDocumentIds([]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const loadDocumentPreview = async (documentId: string) => {
    setLoadingPreviewId(documentId);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${documentId}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Could not load document preview.");
      }

      setSelectedDocumentDetail(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const generateRequirements = async (documentId: string) => {
    setGeneratingRequirementsId(documentId);
    setMessage("");
    setGeneratedRequirements(null);

    try {
      const response = await fetch(
        `${API_V1_DOCUMENTS_URL}/${documentId}/requirements/generate`,
        {
          method: "POST",
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Could not generate requirements.");
      }

      setGeneratedRequirements(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setGeneratingRequirementsId(null);
    }
  };

  const generateTestCases = async (requirementId: string) => {
    setGeneratingTestCasesId(requirementId);
    setMessage("");

    try {
      const response = await fetch(
        `${API_V1_REQUIREMENTS_URL}/${requirementId}/test-cases/generate`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Could not generate test cases.");
      }

      setTestCasesMap((prev) => ({ ...prev, [requirementId]: data }));
      setExpandedTestCasesId(requirementId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to backend. Please make sure it is running.",
      );
    } finally {
      setGeneratingTestCasesId(null);
    }
  };

  const toggleTestCasesPanel = (requirementId: string) => {
    setExpandedTestCasesId((prev) => (prev === requirementId ? null : requirementId));
  };

  const allVisibleSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((document) => selectedDocumentIds.includes(document.id));

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
            className="secondary-button"
            disabled={isDeletingSelected || selectedDocumentIds.length === 0}
            onClick={deleteSelectedDocuments}
          >
            {isDeletingSelected
              ? "Deleting..."
              : `Delete Selected (${selectedDocumentIds.length})`}
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
        <div className="document-table-wrapper">
          <table className="documents-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={filteredDocuments.length === 0}
                    onChange={toggleAllVisibleDocuments}
                    aria-label="Select all visible documents"
                  />
                </th>
                <th>Original filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(document.id)}
                      onChange={() => toggleDocumentSelection(document.id)}
                      aria-label={`Select ${document.original_filename}`}
                    />
                  </td>
                  <td>{document.original_filename}</td>
                  <td>{document.file_type}</td>
                  <td>{formatFileSize(document.file_size)}</td>
                  <td>{document.status}</td>
                  <td>{document.uploaded_at}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={loadingPreviewId === document.id}
                        onClick={() => loadDocumentPreview(document.id)}
                      >
                        {loadingPreviewId === document.id ? "Loading..." : "Preview Text"}
                      </button>
                      {document.status === "completed" && (
                        <button
                          type="button"
                          disabled={generatingRequirementsId === document.id}
                          onClick={() => generateRequirements(document.id)}
                        >
                          {generatingRequirementsId === document.id
                            ? "Generating..."
                            : "Generate Requirements"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedDocumentDetail && (
        <div className="document-preview">
          <div className="section-header">
            <h3>Extracted Text Preview</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedDocumentDetail(null)}
            >
              Close
            </button>
          </div>
          <p>
            <strong>Filename:</strong> {selectedDocumentDetail.original_filename}
          </p>
          <p>
            <strong>Status:</strong> {selectedDocumentDetail.status}
          </p>
          <p>
            <strong>Text length:</strong> {selectedDocumentDetail.text_length}
          </p>
          {selectedDocumentDetail.error_message && (
            <p className="message error">
              <strong>Error:</strong> {selectedDocumentDetail.error_message}
            </p>
          )}
          <pre className="text-preview">
            {selectedDocumentDetail.preview || "No extracted text preview available."}
          </pre>
        </div>
      )}
      {generatedRequirements && (
        <div className="requirements-panel">
          <div className="section-header">
            <h3>Generated Requirements</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setGeneratedRequirements(null)}
            >
              Close
            </button>
          </div>
          <p>
            <strong>Total:</strong> {generatedRequirements.total_requirements}
          </p>
          <div className="requirements-text-list">
            {generatedRequirements.requirements.map((requirement, index) => (
              <article className="requirement-text-item" key={requirement.id}>
                <div className="requirement-item-header">
                  <h4>Requirement {index + 1}</h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span>{requirement.status}</span>
                    <button
                      type="button"
                      className="generate-tc-button"
                      disabled={generatingTestCasesId === requirement.id}
                      onClick={() => generateTestCases(requirement.id)}
                      title="Generate test cases from this requirement"
                    >
                      {generatingTestCasesId === requirement.id
                        ? "⏳ Generating..."
                        : testCasesMap[requirement.id]
                          ? "↻ Re-generate Test Cases"
                          : "⚡ Generate Test Cases"}
                    </button>
                    {testCasesMap[requirement.id] && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleTestCasesPanel(requirement.id)}
                      >
                        {expandedTestCasesId === requirement.id
                          ? `▲ Hide (${testCasesMap[requirement.id].total_test_cases})`
                          : `▼ Show (${testCasesMap[requirement.id].total_test_cases})`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="requirement-field">
                  <strong>Functional Requirement</strong>
                  <p>{requirement.functional_requirement || requirement.description}</p>
                </div>
                <div className="requirement-field">
                  <strong>Validation Rule</strong>
                  <RequirementTextList items={requirement.validation_rule} />
                </div>
                <div className="requirement-field">
                  <strong>Permission</strong>
                  <RequirementTextList items={requirement.permission} />
                </div>
                <div className="requirement-field">
                  <strong>Workflow</strong>
                  <RequirementTextList items={requirement.workflow} />
                </div>
                <div className="requirement-field">
                  <strong>State</strong>
                  <RequirementTextList items={requirement.state} />
                </div>
                <div className="requirement-field">
                  <strong>Error Handling</strong>
                  <RequirementTextList items={requirement.error_handling} />
                </div>
                <p className="requirement-meta">
                  <strong>Confidence:</strong>{" "}
                  {requirement.confidence_score === null
                    ? "-"
                    : requirement.confidence_score.toFixed(2)}
                </p>

                {/* Test Cases Panel */}
                {expandedTestCasesId === requirement.id && testCasesMap[requirement.id] && (
                  <div className="test-cases-panel">
                    <div className="test-cases-panel-header">
                      <h5>Test Cases ({testCasesMap[requirement.id].total_test_cases})</h5>
                    </div>
                    <div className="test-cases-list">
                      {testCasesMap[requirement.id].test_cases.map((tc, tcIndex) => (
                        <div className="test-case-card" key={tc.id}>
                          <div className="test-case-card-header">
                            <span className="tc-index">TC-{tcIndex + 1}</span>
                            <span className="tc-title">{tc.title}</span>
                            <div className="tc-badges">
                              <span className={`tc-badge priority-${tc.priority.toLowerCase()}`}>
                                {tc.priority}
                              </span>
                              {tc.test_type && (
                                <span className="tc-badge type-badge">{tc.test_type}</span>
                              )}
                              {tc.severity && (
                                <span className="tc-badge severity-badge">{tc.severity}</span>
                              )}
                              {tc.automation_candidate && (
                                <span className="tc-badge automation-badge">🤖 Auto</span>
                              )}
                            </div>
                          </div>
                          {tc.scenario && (
                            <div className="tc-field">
                              <strong>Scenario</strong>
                              <p>{tc.scenario}</p>
                            </div>
                          )}
                          {tc.preconditions && (
                            <div className="tc-field">
                              <strong>Preconditions</strong>
                              <p>{tc.preconditions}</p>
                            </div>
                          )}
                          {tc.test_steps && tc.test_steps.length > 0 && (
                            <div className="tc-field">
                              <strong>Test Steps</strong>
                              <ol className="tc-steps">
                                {tc.test_steps.map((step, stepIdx) => (
                                  <li key={stepIdx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {tc.test_data && (
                            <div className="tc-field">
                              <strong>Test Data</strong>
                              <p>{tc.test_data}</p>
                            </div>
                          )}
                          <div className="tc-field tc-expected">
                            <strong>Expected Result</strong>
                            <p>{tc.expected_result}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default DocumentList;
