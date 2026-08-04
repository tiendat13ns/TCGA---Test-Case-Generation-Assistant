# SOFTWARE REQUIREMENTS SPECIFICATION
# AI Test Case Generation Assistant (TCGA)

**Phiên bản:** 2.0 — Cập nhật theo hệ thống triển khai thực tế  
**Ngày cập nhật:** 2026-08-03  
**Trạng thái:** Production-ready MVP

---

## 1. Giới thiệu

### 1.1 Mục tiêu hệ thống

Hệ thống **AI Test Case Generation Assistant (TCGA)** hỗ trợ BA/QA tự động hóa việc:

1. **Phân tích tài liệu đặc tả** (SRS, BRD, User Story, API Spec) thông qua pipeline Upload → Text Extraction → Vector Embedding → RAG Retrieval.
2. **Trích xuất Requirement có cấu trúc** bằng AI (LLM + Pydantic validation schema).
3. **Sinh Test Case chuẩn QA** từ Requirement đã được review/approve.
4. **Quản lý và export** Test Case ra Excel (`.xlsx`) theo chuẩn 10 cột.
5. **AI Chat Workspace** để hỏi đáp, phân tích và thao tác nhanh với tài liệu/requirement/test case.

**Trọng tâm kỹ thuật:**
- Backend kiểm soát state machine, validate AI schema trước khi lưu DB.
- RAG (Retrieval-Augmented Generation) tách biệt theo từng Project để đảm bảo dữ liệu không bị trộn lẫn.
- Hệ thống Credit để theo dõi chi phí API mỗi tác vụ AI.
- Human-in-the-Loop: AI có thể đặt câu hỏi làm rõ (clarifying_questions), người dùng trả lời (user_answers).

### 1.2 Phạm vi MVP (Đã triển khai)

| Tính năng | Trạng thái |
|-----------|------------|
| Xác thực người dùng (Supabase Auth + JWT) | ✅ Done |
| Quản lý Project (CRUD) | ✅ Done |
| Upload tài liệu đa định dạng | ✅ Done |
| Text Extraction + Vector Embedding (RAG) | ✅ Done |
| AI Requirement Extraction (LangGraph + OpenAI-compatible) | ✅ Done |
| Requirement Review / Human-in-the-Loop Q&A | ✅ Done |
| AI Test Case Generation từ Requirement | ✅ Done |
| Test Case Studio (Bulk Edit, Filter, CRUD) | ✅ Done |
| Export Excel (.xlsx) 10 cột | ✅ Done |
| AI Chat Workspace (Streaming SSE) | ✅ Done |
| Credit & Usage Tracking | ✅ Done |
| Auto Bug Report Generation | ✅ Done |

### 1.3 Ngoài phạm vi MVP

- Tích hợp Jira / TestRail / Xray hai chiều.
- Collaborative editing realtime (WebSocket multi-user).
- Fine-tuning model riêng (custom LLM).
- OCR nâng cao cho scan PDF chất lượng thấp.
- Tự động chạy test automation hoặc sinh automation script hoàn chỉnh.
- Email notification / Webhook.
- Gói thanh toán Lite / Pro (hiện tại chỉ hiển thị, chưa tích hợp payment gateway).

---

## 2. Tổng quan người dùng và vai trò

| Vai trò | Quyền hạn | Ghi chú |
|---------|-----------|---------|
| **User (Tester/BA)** | Tạo/xóa Project, upload Document, generate Requirement & Test Case, bulk edit, export, chat AI | Role mặc định khi đăng ký |
| **Admin** | Toàn bộ quyền User + quản trị hệ thống | Role `admin` trong trường `users.role` |

**Credit System (Free Plan):**
- Tài khoản mới được cấp **300 Credits**.
- Giới hạn: tối đa **5 Documents** và **3 Projects** per account.

---

## 3. Luồng nghiệp vụ tổng thể

### 3.1 Core Workflow

```
[User] Đăng nhập (Supabase Auth → JWT)
   ↓
[User] Tạo hoặc chọn Project
   ↓
[User] Upload tài liệu vào Project
   ↓
[Backend] Kiểm tra: file type, file size (≤10MB), credit quota
   ↓  Trừ 2 Credits (DOCUMENT_INGESTION)
[Backend] Lưu file → storage (uploads/), tạo Document record (status="uploaded")
   ↓
[Extract Engine] Trích xuất text (pdfplumber/python-docx/openpyxl...)
   → Thành công: status = "completed", lưu extracted_text
   → Thất bại:   status = "failed",    lưu error_message
   ↓
[Embedding Pipeline] Chunking (LangChain) → Embedding (1536-dim) → lưu document_chunks + HNSW index
   ↓
[User] Chọn Document "completed" → yêu cầu Generate Requirements
   ↓  Trừ 5 Credits (REQUIREMENT_EXTRACTION)
[Backend] RAG Query → retrieve top-12 chunks → build prompt → gọi LLM
   ↓
[LLM] Trả về JSON → Backend Pydantic validate → lưu requirements (status="ai_generated")
   AI có thể sinh clarifying_questions → lưu vào requirement.clarifying_questions
   ↓
[User] Review Requirement → trả lời clarifying_questions (PATCH /requirements/{id}/answers)
   → Approve / Edit / Reject
   ↓
[User] Chọn Requirement → yêu cầu Generate Test Cases
   ↓  Trừ 10 Credits (TEST_CASE_GENERATION)
[Backend] Build prompt từ requirement context → gọi LLM
   ↓
[LLM] Trả về JSON → Backend Pydantic validate → lưu test_cases (status="ai_generated")
   ↓
[User] Test Case Studio: Review / Bulk Edit / Filter / Approve / Reject
   ↓
[User] Export Excel (.xlsx) → lưu export_history (qua usage_logs)
```

### 3.2 AI Chat Workflow

```
[User] Mở AI Chat Workspace trong Project
   ↓
[User] Nhập câu hỏi / lệnh nhanh (Quick Actions)
   ↓  Trừ 2 Credits (COPILOT_CHAT)
[Chat Agent] Phân tích intent → gọi tool nếu cần:
   - retrieve_relevant_chunks (RAG semantic search theo project)
   - create_requirements_from_document
   - create_test_cases_from_requirement
   ↓
[Response] Streaming SSE (text/event-stream) → hiển thị trực tiếp trên UI
```

---

## 4. Yêu cầu chức năng chi tiết

### 4.1 UC01 — Xác thực người dùng (Authentication)

**Actors:** User

| ID | Yêu cầu |
|----|---------|
| UC01-F01 | User đăng ký bằng email + password. Backend gọi Supabase Auth `sign_up`, sau đó tạo record trong bảng `users` với `credit_balance = 300`. |
| UC01-F02 | User đăng nhập bằng email + password. Backend gọi Supabase `sign_in_with_password`, trả về `access_token` (JWT) + `refresh_token`. |
| UC01-F03 | Mọi API yêu cầu auth đều dùng Bearer token (JWT). Backend giải mã JWT bằng Supabase public key. |
| UC01-F04 | `GET /api/auth/me` trả về `{id, email, role, credit_balance, created_at}`. |
| UC01-F05 | Nếu email đã tồn tại trong DB → trả về HTTP 400 `"Email already registered"`. |
| UC01-F06 | Nếu JWT không hợp lệ/hết hạn → trả về HTTP 401. |

**State Machine User:**
```
[unregistered] → đăng ký → [active]
[active] → đăng nhập → [authenticated session]
[authenticated session] → hết token → [expired] → refresh → [authenticated session]
```

---

### 4.2 UC02 — Quản lý Project

**Actors:** User (đã đăng nhập)

| ID | Yêu cầu |
|----|---------|
| UC02-F01 | User tạo Project với `name` (bắt buộc) và `description` (tùy chọn). Project tự động gắn `user_id` của người tạo. |
| UC02-F02 | `GET /api/v1/projects` trả về danh sách Projects của user hiện tại kèm thống kê: `file_count`, `req_count`, `test_case_count` (số requirement distinct có test case). |
| UC02-F03 | `GET /api/v1/projects/{id}` trả về chi tiết một project. Backend kiểm tra `project.user_id == current_user.id`; nếu không khớp → trả về 404 (không lộ 403 để tránh enumeration). |
| UC02-F04 | `PUT /api/v1/projects/{id}` cho phép cập nhật `name`, `description`. |
| UC02-F05 | `DELETE /api/v1/projects/{id}` xóa cascade toàn bộ: Documents → DocumentChunks → Requirements → TestCases. |
| UC02-F06 | Trang Overview mặc định khi đăng nhập (`/overview`). Projects được hiển thị dạng Grid. |

---

### 4.3 UC03 — Upload & Quản lý Document

**Actors:** User

| ID | Yêu cầu |
|----|---------|
| UC03-F01 | `POST /api/documents/upload` nhận `multipart/form-data` với một hoặc nhiều files và tham số `project_id` (query param, tùy chọn). |
| UC03-F02 | **Định dạng file được chấp nhận:** `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `dbml`, và `zip` (chứa các file trên). |
| UC03-F03 | **Giới hạn kích thước:** Tối đa **10MB** mỗi file. File vượt giới hạn → HTTP 400 `"File too large"`. |
| UC03-F04 | Nếu user đã đăng nhập, Backend kiểm tra quota Free Plan (tối đa 5 documents). Vượt quota → HTTP 403. |
| UC03-F05 | Trừ **2 Credits** (DOCUMENT_INGESTION) cho mỗi file được upload thành công. |
| UC03-F06 | File được lưu vào thư mục `backend/uploads/` với tên `{uuid}_{original_filename}`. |
| UC03-F07 | Document record được tạo với `status = "uploaded"`. Backend tự động trigger text extraction. |
| UC03-F08 | **Text Extraction Pipeline:** |
| | - PDF: `pdfplumber` |
| | - DOCX: `python-docx` |
| | - XLSX/CSV: `openpyxl` + pandas-like parse |
| | - TXT/MD/DBML: đọc trực tiếp |
| | - ZIP: giải nén → xử lý từng file bên trong |
| UC03-F09 | Sau extraction thành công: `status = "completed"`, `extracted_text` được lưu. |
| UC03-F10 | Sau extraction thất bại: `status = "failed"`, `error_message` lưu lý do lỗi. |
| UC03-F11 | **Embedding Pipeline** (sau extraction): Chunking bằng LangChain header-aware text splitter → embed bằng OpenAI-compatible API (1536 dimensions) → lưu vào bảng `document_chunks` với HNSW index. |
| UC03-F12 | `GET /api/documents?project_id=...` trả về danh sách documents của project. |
| UC03-F13 | `GET /api/v1/documents/{id}` trả về chi tiết document bao gồm `extracted_text` preview. |
| UC03-F14 | `POST /api/documents/{id}/extract-text` (manual re-trigger extraction). |
| UC03-F15 | Chỉ document có `status = "completed"` mới được dùng để generate requirements. |

**Document Status State Machine:**
```
uploaded → [Text Extraction] → completed
                              → failed
```

---

### 4.4 UC04 — Trích xuất Requirement (AI Requirement Generation)

**Actors:** User, AI Agent

| ID | Yêu cầu |
|----|---------|
| UC04-F01 | `POST /api/v1/documents/{document_id}/requirements/generate` kích hoạt quá trình generate requirements. |
| UC04-F02 | Backend kiểm tra: document phải có `status = "completed"` và `extracted_text` không rỗng. |
| UC04-F03 | **RAG Strategy:** Query cố định mô tả phạm vi tìm kiếm → retrieve **top-12 chunks** từ `document_chunks` (cosine similarity, HNSW index). |
| UC04-F04 | Nếu chưa có chunks trong DB → fallback về toàn bộ `extracted_text`. |
| UC04-F05 | Backend build prompt (system + user) → gọi LLM qua OpenAI-compatible API. |
| UC04-F06 | LLM trả về JSON → Backend parse JSON → Pydantic validate (`AIRequirementOutput`). |
| UC04-F07 | Requirements cũ của document bị **xóa** trước khi tạo mới (re-generate). |
| UC04-F08 | Requirements được lưu vào DB với `status = "ai_generated"`. |
| UC04-F09 | AI có thể sinh `clarifying_questions` (list[str]) nếu cần làm rõ. |
| UC04-F10 | Mọi lần AI chạy ghi `AgentLog` với: `task_type`, `model`, `status`, `execution_time_ms`, `error_message`. |
| UC04-F11 | `GET /api/v1/documents/{document_id}/requirements` trả về danh sách requirements của document. |
| UC04-F12 | `PATCH /api/v1/requirements/{id}/answers` cho phép user gửi `answers: list[str]` trả lời clarifying_questions. |

**Requirement Status State Machine:**
```
ai_generated → [User Review] → approved
                             → rejected
                             → (edit trực tiếp, giữ ai_generated)
```

---

### 4.5 UC05 — Sinh Test Case (AI Test Case Generation)

**Actors:** User, AI Agent

| ID | Yêu cầu |
|----|---------|
| UC05-F01 | `POST /api/v1/requirements/{requirement_id}/test-cases/generate` kích hoạt generate. |
| UC05-F02 | Backend từ chối nếu requirement có `status = "rejected"`. |
| UC05-F03 | Backend build prompt từ: `title`, `description`, `functional_requirement`, `business_rules`, `inputs`, `outputs`, `preconditions`, `validation_rules`, `exception_flows`, `user_answers` (nếu có). |
| UC05-F04 | RAG: retrieve thêm context liên quan từ `document_chunks` của document gốc. |
| UC05-F05 | LLM trả về JSON → Pydantic validate (`AITestCaseOutput`). |
| UC05-F06 | Test cases thiếu `title` hoặc `expected_result` → bị loại, không lưu DB. |
| UC05-F07 | Test cases cũ của requirement bị **xóa** trước khi lưu mới (re-generate). |
| UC05-F08 | Test cases lưu với `status = "ai_generated"`, `execution_status = "Untested"`. |
| UC05-F09 | `GET /api/v1/requirements/{id}/test-cases` trả về danh sách test cases của requirement. |

**Test Case Status State Machine:**
```
ai_generated → [User Review] → approved
                             → rejected
(any status) → [Export]      → exported
```

**Test Case Execution Status:**
```
Untested → Pass
         → Fail
         → Blocked
```

---

### 4.6 UC06 — Test Case Studio (Quản lý hàng loạt)

**Actors:** User

| ID | Yêu cầu |
|----|---------|
| UC06-F01 | `GET /api/v1/test-cases` trả về danh sách test cases với filter: `project_id`, `document_id`, `priority`, `status`, `test_type`. |
| UC06-F02 | `PUT /api/v1/test-cases/{id}` cập nhật bất kỳ trường nào của test case (partial update). Tự động tăng `version` và cập nhật `updated_at`. |
| UC06-F03 | `POST /api/v1/test-cases` tạo test case thủ công từ requirement có sẵn. |
| UC06-F04 | `GET /api/v1/test-cases/export?project_id=...` xuất Excel 10 cột: `Feature | Test Case ID | Title | Precondition | Test Steps | Test Data | Expected Output | Priority | Note | Test Type`. |
| UC06-F05 | Test Case ID trong Excel được format: `TC-01`, `TC-02`, ... (padded). |
| UC06-F06 | Feature name lấy theo thứ tự ưu tiên: `requirement.feature_name` → `requirement.module_name` → `requirement.title` → `"Unknown Feature"`. |
| UC06-F07 | Bộ lọc động: Status (ai_generated/approved/rejected/exported), Priority (High/Medium/Low), Test Type (Positive/Negative/Boundary/...). |
| UC06-F08 | Bulk edit hàng loạt: lưu nhiều test case song song (multi-save). |

---

### 4.7 UC07 — AI Chat Workspace

**Actors:** User, Chat Agent

| ID | Yêu cầu |
|----|---------|
| UC07-F01 | `POST /api/chat/message` xử lý tin nhắn chat. Hỗ trợ `stream: true` (SSE) và `stream: false` (JSON). |
| UC07-F02 | Streaming response format: `data: {"chunk": "..."}\n\n` → kết thúc bằng `data: [DONE]\n\n`. |
| UC07-F03 | Agent có khả năng gọi tool: `retrieve_relevant_chunks` (RAG theo project), `create_requirements`, `create_test_cases`. |
| UC07-F04 | RAG Isolation: semantic search được cô lập theo `project_id` để tránh trộn dữ liệu giữa các project. |
| UC07-F05 | Quick Actions trên UI: Phân tích tổng quan, Tạo Requirement, Tạo Test Case. |
| UC07-F06 | Chat history được lưu trên `localStorage` theo `projectId`. |
| UC07-F07 | Trừ **2 Credits** (COPILOT_CHAT) mỗi lần gọi chat. |

---

### 4.8 UC08 — Auto Bug Report

**Actors:** User, AI Agent

| ID | Yêu cầu |
|----|---------|
| UC08-F01 | `POST /api/v1/test-cases/{id}/bug-report` nhận `actual_result: str`. |
| UC08-F02 | Agent lấy `title`, `preconditions`, `test_steps`, `expected_result` của test case → kết hợp với `actual_result` → sinh Bug Report có cấu trúc. |
| UC08-F03 | Trả về `{"report": "<markdown_content>"}`. |

---

### 4.9 UC09 — Credit & Usage Management

**Actors:** User

| ID | Yêu cầu |
|----|---------|
| UC09-F01 | `GET /api/usage/summary` trả về: `credit_balance`, `current_plan`, `total_credits_used`, danh sách các gói (Free/Lite/Pro). |
| UC09-F02 | `GET /api/usage/logs?limit=50&offset=0` trả về lịch sử trừ credit theo tác vụ. |
| UC09-F03 | Mỗi lần trừ credit: ghi `UsageLog` với `operation`, `target_name`, `credits_used`. |

**Bảng giá Credit:**

| Tác vụ | Credits |
|--------|---------|
| DOCUMENT_INGESTION | 2 |
| COPILOT_CHAT | 2 |
| REQUIREMENT_EXTRACTION | 5 |
| TEST_CASE_GENERATION | 10 |

---

## 5. Data Schema (thực tế triển khai)

### 5.1 Bảng `users`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | Map 1-1 với Supabase auth.users |
| email | Text (unique) | |
| role | Text | Default: `"user"` |
| credit_balance | Integer | Default: 300 |
| created_at | Timestamp | |
| updated_at | Timestamp | Nullable |

### 5.2 Bảng `projects`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users.id (CASCADE) |
| name | Text | Required |
| description | Text | Nullable |
| created_at | Timestamp | |
| updated_at | Timestamp | Nullable |

### 5.3 Bảng `documents`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id (CASCADE), nullable |
| original_filename | Text | Tên file gốc |
| stored_filename | Text | Tên file lưu trữ |
| file_type | Text | `pdf`, `docx`, `txt`, ... |
| file_size | BigInteger | bytes |
| file_path | Text | Đường dẫn trên server |
| extracted_text | Text | Nullable |
| error_message | Text | Nullable |
| status | Text | `uploaded` → `completed` / `failed` |
| uploaded_at | Timestamp | |
| updated_at | Timestamp | Nullable |

### 5.4 Bảng `document_chunks`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| document_id | UUID | FK → documents.id (CASCADE) |
| project_id | UUID | Denormalized để tránh JOIN khi RAG |
| chunk_index | Integer | Thứ tự chunk |
| content | Text | Nội dung chunk |
| token_count | Integer | Nullable |
| embedding | Vector(1536) | OpenAI text-embedding-3-small |
| created_at | Timestamp | |

**Index:** HNSW trên `embedding` (cosine ops), B-Tree trên `project_id`.

### 5.5 Bảng `requirements`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id (SET NULL) |
| document_id | UUID | FK → documents.id |
| title | Text | |
| description | Text | |
| functional_requirement | Text | Nullable |
| validation_rule | JSON | list[str] |
| permission | JSON | list[str] |
| workflow | JSON | list[str] |
| state | JSON | list[str] |
| error_handling | JSON | list[str] |
| module_name | Text | Nullable |
| feature_name | Text | Nullable |
| actor | Text | Nullable |
| business_rules | JSON | list[str] |
| inputs | JSON | list[str] |
| outputs | JSON | list[str] |
| preconditions | JSON | list[str] |
| validation_rules | JSON | list[str] |
| exception_flows | JSON | list[str] |
| source_reference | Text | Nullable |
| confidence_score | Float | 0.0–1.0 |
| status | Text | `ai_generated` / `approved` / `rejected` |
| version | Integer | Default: 1 |
| created_by | UUID | Nullable |
| clarifying_questions | JSON | list[str] — AI đặt câu hỏi |
| user_answers | JSON | list[str] — BA/QA trả lời |
| created_at | Timestamp | |
| updated_at | Timestamp | Nullable |

### 5.6 Bảng `test_cases`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| requirement_id | UUID | FK → requirements.id |
| document_id | UUID | FK → documents.id, nullable |
| title | Text | Required |
| scenario | Text | Nullable |
| preconditions | Text | Nullable |
| test_steps | JSON | list[str] |
| test_data | Text | Nullable |
| expected_result | Text | Required |
| actual_result | Text | Nullable |
| priority | Text | `High` / `Medium` / `Low` |
| severity | Text | `Critical` / `Major` / `Minor` / `Trivial` |
| test_type | Text | `Positive` / `Negative` / `Boundary` / `Validation` / `Integration` / `Security` / `Other` |
| automation_candidate | Boolean | Default: false |
| execution_type | Text | `Manual` / `Automation Candidate` |
| execution_status | Text | `Untested` / `Pass` / `Fail` / `Blocked` |
| status | Text | `ai_generated` / `approved` / `rejected` / `exported` |
| note | Text | Nullable |
| version | Integer | Default: 1 |
| created_at | Timestamp | |
| updated_at | Timestamp | Nullable |

### 5.7 Bảng `agent_logs`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| task_type | Text | `extract_requirements` / `generate_test_cases` |
| provider | Text | `openai_compatible` |
| model | Text | Tên model từ env |
| status | Text | `success` / `failed` |
| input_reference_id | UUID | document_id hoặc requirement_id |
| input_type | Text | `document` / `requirement` |
| prompt_preview | Text | Nullable |
| raw_output | Text | Nullable |
| error_message | Text | Nullable |
| execution_time_ms | Integer | Thời gian thực thi (ms) |
| created_at | Timestamp | |

### 5.8 Bảng `usage_logs`

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | UUID | PK |
| user_id | UUID | FK → users.id (CASCADE) |
| operation | Text | `DOCUMENT_INGESTION` / `REQUIREMENT_EXTRACTION` / `TEST_CASE_GENERATION` / `COPILOT_CHAT` |
| target_name | Text | Tên tài liệu / project liên quan |
| credits_used | Integer | Số credit đã trừ |
| created_at | Timestamp | |

---

## 6. AI Output Schema (Pydantic Validation)

### 6.1 Requirement Extraction — `AIRequirementOutput`

```json
{
  "requirements": [
    {
      "functional_requirement": "string (required)",
      "title": "string | null",
      "description": "string | null",
      "module_name": "string | null",
      "feature_name": "string | null",
      "actor": "string | null",
      "business_rules": ["string"],
      "inputs": ["string"],
      "outputs": ["string"],
      "preconditions": ["string"],
      "validation_rule": ["string"],
      "validation_rules": ["string"],
      "workflow": ["string"],
      "state": ["string"],
      "error_handling": ["string"],
      "exception_flows": ["string"],
      "permission": ["string"],
      "source_reference": "string | null",
      "confidence_score": 0.0,
      "status": "ai_generated | needs_review",
      "clarifying_questions": ["string"]
    }
  ]
}
```

**Validation rules:**
- `functional_requirement` là trường bắt buộc và không được rỗng.
- `confidence_score` phải trong khoảng [0.0, 1.0].
- `status` chỉ nhận `ai_generated` hoặc `needs_review`.
- Tất cả các trường list[str] tự động normalize: `None → []`, `str → [str]`.
- List rỗng (`[]`) được ghi là `[]`.

### 6.2 Test Case Generation — `AITestCaseOutput`

```json
{
  "test_cases": [
    {
      "title": "string (required)",
      "scenario": "string | null",
      "preconditions": "string | null",
      "test_steps": ["step 1", "step 2"],
      "test_data": "string | null",
      "expected_result": "string (required)",
      "priority": "High | Medium | Low",
      "severity": "Critical | Major | Minor | Trivial | null",
      "test_type": "Positive | Negative | Boundary | Validation | Integration | Security | Other | null",
      "automation_candidate": false,
      "execution_type": "Manual | Automation Candidate"
    }
  ]
}
```

**Validation rules:**
- `title` và `expected_result` là bắt buộc; nếu thiếu → item bị loại.
- `test_steps` tự động làm sạch: loại bỏ prefix `"Bước 1:"`, `"Step 1:"`, `"1."`, `"1)"`, dấu `-` đầu dòng.
- `priority` normalize: capitalize, fallback về `"Medium"` nếu không hợp lệ.
- `severity` normalize: capitalize, trả về `null` nếu không hợp lệ.
- `test_type` normalize: thử exact match → capitalize → fallback về `"Other"`.
- `execution_type` normalize: fallback về `"Manual"`.

---

## 7. API Contract

### 7.1 Auth APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/register` | ❌ | Đăng ký tài khoản mới |
| POST | `/api/auth/login` | ❌ | Đăng nhập, nhận JWT |
| GET | `/api/auth/me` | ✅ | Lấy thông tin user hiện tại |

### 7.2 Project APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/v1/projects` | ✅ | Danh sách projects + stats |
| POST | `/api/v1/projects` | ✅ | Tạo project mới |
| GET | `/api/v1/projects/{id}` | ✅ | Chi tiết project |
| PUT | `/api/v1/projects/{id}` | ✅ | Cập nhật project |
| DELETE | `/api/v1/projects/{id}` | ✅ | Xóa cascade project |

### 7.3 Document APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/documents/upload` | 🔶 Optional | Upload file(s) vào project |
| GET | `/api/documents` | ❌ | Danh sách documents (filter by project_id) |
| GET | `/api/v1/documents/{id}` | ❌ | Chi tiết + preview document |
| POST | `/api/documents/{id}/extract-text` | ❌ | Manual trigger text extraction |
| DELETE | `/api/documents` | ❌ | Xóa toàn bộ upload history |
| DELETE | `/api/documents/selected` | ❌ | Xóa các document được chọn |

> 🔶 Auth optional: nếu có token → kiểm tra quota + trừ credit; nếu không có → cho phép upload tự do (dev mode).

### 7.4 Requirement APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/v1/documents/{id}/requirements/generate` | ❌ | Generate requirements từ document |
| GET | `/api/v1/documents/{id}/requirements` | ❌ | Danh sách requirements |
| PATCH | `/api/v1/requirements/{id}/answers` | ❌ | Submit clarifying answers |

### 7.5 Test Case APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/v1/requirements/{id}/test-cases/generate` | ❌ | Generate test cases từ requirement |
| GET | `/api/v1/requirements/{id}/test-cases` | ❌ | Danh sách test cases của requirement |
| GET | `/api/v1/test-cases` | ❌ | Danh sách (filter: project, doc, priority, status, type) |
| GET | `/api/v1/test-cases/export` | ❌ | Export Excel (.xlsx) |
| POST | `/api/v1/test-cases` | ❌ | Tạo test case thủ công |
| PUT | `/api/v1/test-cases/{id}` | ❌ | Cập nhật test case |
| POST | `/api/v1/test-cases/{id}/bug-report` | ❌ | Generate Bug Report tự động |

### 7.6 Chat & Agent APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/chat/message` | 🔶 Optional | AI Chat (stream hoặc JSON) |
| POST | `/api/agent/run` | ❌ | Direct agent invocation |

### 7.7 Usage APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/usage/summary` | ✅ | Tổng quan credit, gói dịch vụ |
| GET | `/api/usage/logs` | ✅ | Lịch sử sử dụng credit |

---

## 8. Non-Functional Requirements

### 8.1 Hiệu năng

| Chỉ số | Mục tiêu |
|--------|---------|
| API response time (non-AI) | < 500ms |
| RAG vector search (HNSW) | < 200ms cho top-12 với 100K chunks |
| AI generation latency (Requirement) | < 30s |
| AI generation latency (Test Case) | < 20s |
| Export Excel | < 3s cho 500 test cases |
| Streaming first-token latency | < 2s |

### 8.2 Bảo mật

| Yêu cầu | Chi tiết |
|---------|---------|
| Authentication | JWT từ Supabase Auth; token validate bằng public key |
| Authorization | Resource isolation: `project.user_id == current_user.id`; 404 thay vì 403 |
| Data isolation | RAG chunks được lọc theo `project_id` trước khi vector search |
| File upload security | Whitelist extension, giới hạn 10MB; filename được sanitize |

### 8.3 Khả năng mở rộng

- **Horizontal scaling**: Backend FastAPI stateless → có thể scale out.
- **DB**: PostgreSQL + pgvector (Supabase) → hỗ trợ connection pooling.
- **AI Provider**: Cấu hình qua `.env` (`OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL`, `OPENAI_COMPATIBLE_API_KEY`) → dễ dàng swap model/provider.

### 8.4 Độ tin cậy

- Nếu DB chưa kết nối được → Backend vẫn khởi động, log warning, trả về 503 cho các API cần DB.
- Text extraction thất bại → ghi `error_message`, document chuyển `failed`; không block toàn bộ upload.
- AI call thất bại → ghi `AgentLog` với status `failed` + `error_message`; trả về HTTP 502 cho client.
- Credit check thực hiện trước khi gọi AI → tránh chi phí khi user hết credit.

### 8.5 Triển khai

- **Docker Compose**: Frontend (port 1302) + Backend (port 1303).
- **Frontend**: React 18 + TypeScript + Vite → build static files, serve bởi Nginx trong container.
- **Backend**: FastAPI + Uvicorn trong Python 3.12 container.
- Cấu hình toàn bộ qua `backend/.env` (không hardcode secrets).

---

## 9. Tech Stack chi tiết

### 9.1 Backend

| Thành phần | Công nghệ |
|-----------|----------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy |
| Database | PostgreSQL + pgvector extension (Supabase) |
| Auth | Supabase Auth (JWT) + python-jose |
| AI Framework | LangChain + LangGraph (workflow orchestration) |
| LLM Provider | OpenAI-compatible API (configurable: Gemini, GPT, ...) |
| Embedding | OpenAI text-embedding-3-small (1536 dims) |
| Vector Index | HNSW via pgvector |
| Text Extraction | pdfplumber, python-docx, openpyxl |
| Export | openpyxl |
| Chunking | langchain-text-splitters (header-aware) |

### 9.2 Frontend

| Thành phần | Công nghệ |
|-----------|----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Data Fetching | TanStack React Query v5 (caching, background refetch) |
| Styling | Vanilla CSS + CSS Variables (Design System Warm Beige) |
| Icons | lucide-react |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Routing | Custom URL routing (pathToView / viewToPath) |
| State | React Context (Auth) + React Query (server state) |

### 9.3 Frontend Pages/Views

| Route | View | Mô tả |
|-------|------|-------|
| `/overview` | ProjectsGrid | Trang mặc định — danh sách project dạng grid |
| `/projects` | ProjectManager | Quản lý project |
| `/projects/{id}` | ProjectDetailDashboard | Chi tiết project: Documents, Requirements, Chat |
| `/test-cases` | TestCaseStudio | Studio quản lý test case toàn project |
| `/usage` | UsageBilling | Credit & gói dịch vụ |
| `/tutorial` | Tutorial | Hướng dẫn sử dụng |

---

## 10. Acceptance Criteria (MVP)

### Authentication
- [x] User đăng ký được, nhận JWT token.
- [x] User đăng nhập được, nhận access_token + refresh_token.
- [x] API yêu cầu auth từ chối request không có token hợp lệ (HTTP 401).

### Project Management
- [x] User tạo, xem, sửa, xóa project.
- [x] Xóa project cascade xóa toàn bộ documents, chunks, requirements, test cases.
- [x] Không lộ project của user khác (trả 404, không 403).

### Document Upload
- [x] Upload thành công file: pdf, docx, txt, md, xlsx, csv, dbml, zip.
- [x] File > 10MB bị từ chối (HTTP 400).
- [x] File sai định dạng bị từ chối (HTTP 400).
- [x] Quota Free Plan (5 docs) được kiểm tra và reject khi vượt (HTTP 403).
- [x] 2 Credits bị trừ mỗi lần upload.
- [x] Document có status rõ ràng: uploaded → completed/failed.
- [x] Chỉ document `completed` mới cho phép generate requirements.

### AI Requirement Extraction
- [x] Generate requirements từ document completed.
- [x] RAG sử dụng top-12 chunks; fallback về extracted_text nếu chưa có chunks.
- [x] Requirements có đủ fields theo schema.
- [x] AI schema validation bằng Pydantic trước khi lưu DB.
- [x] clarifying_questions lưu vào requirement khi AI cần làm rõ.
- [x] User submit answers qua PATCH /requirements/{id}/answers.
- [x] AgentLog ghi mỗi lần AI chạy.
- [x] 5 Credits bị trừ mỗi lần generate.

### AI Test Case Generation
- [x] Generate test cases từ requirement không bị rejected.
- [x] Test case thiếu title hoặc expected_result bị loại.
- [x] Test cases liên kết requirement_id, có đủ fields.
- [x] 10 Credits bị trừ mỗi lần generate.
- [x] test_steps được normalize (xóa prefix số/chữ thừa).

### Test Case Studio & Export
- [x] Xem, lọc test cases theo project/document/priority/status/type.
- [x] Bulk edit: cập nhật nhiều test case, tăng version.
- [x] Export Excel 10 cột, format TC-01, TC-02...
- [x] Bug Report tự động từ actual_result.

### AI Chat
- [x] Chat streaming SSE hoạt động.
- [x] RAG isolation theo project_id.
- [x] 2 Credits bị trừ mỗi lần chat.

---

## 11. Rủi ro và Khuyến nghị

| Rủi ro | Mức độ | Khuyến nghị |
|--------|--------|------------|
| LLM trả về JSON không hợp lệ | Cao | Pydantic validation đã implement; nên thêm retry logic tối đa 2 lần |
| OpenAI-compatible proxy unstable | Trung bình | Log AgentLog đầy đủ; hiển thị error rõ ràng cho user |
| Credit hết giữa session | Trung bình | Check credit trước mọi AI call; hiển thị credit balance trên navbar |
| RAG chunks chưa được embed | Trung bình | Fallback về extracted_text đã implement |
| File size > 10MB cần xử lý | Thấp | Tăng limit hoặc implement streaming upload nếu cần |
| Supabase Auth quota | Thấp | Monitor Supabase dashboard; cân nhắc self-hosted Auth nếu scale |

---

## 12. Kết luận

Hệ thống TCGA MVP đã triển khai đầy đủ pipeline cốt lõi:

**Document Upload → Text Extraction → Vector Embedding → RAG Retrieval → AI Requirement Extraction → Human Review → AI Test Case Generation → Test Case Studio → Export Excel**

Các điểm kỹ thuật quan trọng đã đảm bảo:
1. **State machine nghiêm ngặt**: document status, requirement status, test case status đều được kiểm soát.
2. **AI schema validation**: Pydantic validate 100% trước khi lưu DB.
3. **RAG isolation**: dữ liệu vector search cô lập theo project.
4. **Traceability đầy đủ**: Document → Requirement → TestCase → UsageLog + AgentLog.
5. **Credit governance**: mọi tác vụ AI đều trừ credit và ghi log.

**Bước tiếp theo được khuyến nghị:**
- Thêm retry logic cho AI calls (tối đa 2 lần).
- Thêm auth guard cho toàn bộ Document/Requirement/TestCase APIs (hiện tại nhiều endpoint không yêu cầu auth).
- Implement payment gateway cho gói Lite/Pro.
- Thêm unit test cho Pydantic schemas và service layer.
- Thêm pagination cho các list API.
