# Anti.md — Nhật ký thực hiện branch `feature/test-generation`

> File này ghi lại toàn bộ quá trình thực hiện để tiếp tục khi cần.
> Branch tạo từ: `AIrequirement` → `feature/test-generation`

---

## Bối cảnh

Dự án: **AI Test Case Generation Assistant (TCGA)**  
SRS: `SRS_AI_Test_Case_Generation_Assistant.md` (đã gitignore)  
Luồng chính: `Upload Document → Extract Text → AI Requirement Extraction (UC03) → AI Test Case Generation (UC04)`

---

## Những việc đã làm trước khi tạo branch

### 1. Chuyển AI provider từ Ollama sang OpenAI-compatible (Gemini)

**Lý do:** Dùng API key Gemini qua endpoint `https://api.vilao.ai/v1`, model `ram/gemini-3.5-flash-low`.

**Files tạo mới:**
- `backend/app/services/ai/openai_compatible_provider.py`
  - Class `OpenAICompatibleProvider(BaseAIProvider)`
  - Gọi `/chat/completions` chuẩn OpenAI format
  - Đọc biến env: `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL`, `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_TIMEOUT_SECONDS`

**Files sửa:**
- `backend/app/services/ai/provider.py` — đăng ký `"openai_compatible": OpenAICompatibleProvider`
- `backend/.env` — đổi `AI_PROVIDER=openai_compatible`, thêm các biến mới
- `backend/.env.example` — document cả 2 provider options

**Biến môi trường cần set trong `.env`:**
```
AI_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.vilao.ai/v1
OPENAI_COMPATIBLE_MODEL=ram/gemini-3.5-flash-low
OPENAI_COMPATIBLE_API_KEY=<key thật>
OPENAI_COMPATIBLE_TIMEOUT_SECONDS=180
```

---

### 2. Fix bug delete/clear history bị lỗi FK constraint

**Lý do:** Bảng `requirements` có FK → `documents.id`. Khi xóa document, PostgreSQL báo lỗi FK.

**File sửa:** `backend/app/services/file_service.py`
- `clear_upload_history()`: xóa `Requirement` → `Document` theo thứ tự
- `delete_documents_by_ids()`: với mỗi document, xóa requirements của nó trước

---

### 3. Tạo branch mới từ AIrequirement

```bash
git add -A
git commit -m "feat: add AI requirement extraction with Gemini/OpenAI-compatible provider, fix document delete FK constraint"
git checkout -b feature/test-generation
```

---

## UC04 — AI Test Case Generation (thực hiện trong branch này)

### Kiến trúc

```
POST /api/v1/requirements/{requirement_id}/test-cases/generate
         │
         ▼
  test_case_generation_service.py
         ├── load Requirement từ DB
         ├── build prompt từ toàn bộ context requirement
         ├── call AI provider (generate)
         ├── parse + validate JSON → AITestCaseExtractionResponse
         ├── map → TestCase models
         ├── save DB (test_cases + agent_logs)
         └── return GenerateTestCasesResponse

GET /api/v1/requirements/{requirement_id}/test-cases
         └── list test cases đã lưu
```

### Database

**Model mới:** `TestCase` trong `backend/app/models.py`
```python
class TestCase(Base):
    __tablename__ = "test_cases"
    id, requirement_id (FK→requirements), document_id (FK→documents),
    title, scenario, preconditions, test_steps (JSON), test_data (TEXT),
    expected_result, priority, severity, test_type,
    automation_candidate (Boolean), execution_type,
    status, version, created_at, updated_at
```

**Migration:** `backend/app/database.py` — thêm `_ensure_test_case_columns()` vào `init_db()`
- Dùng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (idempotent)
- **Quan trọng:** Cột `test_data` trong DB cũ có type `JSON` (schema cũ khác).  
  Migration fix bằng: `ALTER TABLE test_cases ALTER COLUMN test_data TYPE TEXT USING test_data::TEXT`

**Delete FK cascade fix:** `file_service.py` — cập nhật thứ tự xóa:
`test_cases → requirements → documents`

---

### Files tạo mới (UC04)

| File | Mục đích |
|------|----------|
| `backend/app/schemas/ai_test_case_schema.py` | Validate AI output JSON. Normalize enum lỗi: bad priority→Medium, bad test_type→Other |
| `backend/app/schemas/test_case_schema.py` | API response: `TestCaseResponse`, `GenerateTestCasesResponse`, `ListTestCasesResponse` |
| `backend/app/prompts/test_case_generation_prompt.py` | `SYSTEM_PROMPT` + `build_user_prompt(requirement)` inject full context |
| `backend/app/repositories/test_case_repository.py` | `create_many`, `list_by_requirement_id`, `get_latest_version_by_requirement_id` |
| `backend/app/services/test_case_generation_service.py` | Service chính: AI call, JSON normalize/parse, validate, DB save, AgentLog |
| `backend/app/routers/test_cases.py` | 2 endpoints: POST generate + GET list |

### Files sửa (UC04)

| File | Thay đổi |
|------|----------|
| `backend/app/models.py` | Thêm `Boolean` import, thêm `TestCase` class |
| `backend/app/database.py` | Thêm `_ensure_test_case_columns()` trong `init_db()` |
| `backend/app/main.py` | Import và đăng ký `test_cases_router` |
| `backend/app/services/file_service.py` | Fix delete cascade: xóa test_cases trước requirements |

---

### Frontend (UC04)

**File sửa:** `frontend/src/components/DocumentList.tsx`
- Thêm types: `TestCaseItem`, `GenerateTestCasesResponse`
- Thêm state: `testCasesMap`, `generatingTestCasesId`, `expandedTestCasesId`
- Thêm hàm: `generateTestCases(requirementId)`, `toggleTestCasesPanel(requirementId)`
- Trong mỗi requirement card:
  - Nút **⚡ Generate Test Cases** (tím) → gọi POST generate
  - Nút **↻ Re-generate** sau khi đã có kết quả
  - Nút **▼ Show (N) / ▲ Hide (N)** toggle panel
  - Panel test cases: title, badges (priority/type/severity/🤖 Auto), test steps (ordered list), expected result

**File sửa:** `frontend/src/styles.css`
- Thêm styles cho: `.generate-tc-button`, `.test-cases-panel`, `.test-case-card`, `.tc-badges`, `.tc-badge` (priority-high/medium/low, type-badge, severity-badge, automation-badge), `.tc-field`, `.tc-steps`, `.tc-expected`

---

## Bugs đã gặp và fix

### Bug 1: AI provider unavailable
**Nguyên nhân:** `OPENAI_COMPATIBLE_API_KEY=your_api_key_here` chưa thay bằng key thật.  
**Fix:** Điền key thật vào `.env`.

### Bug 2: Delete document lỗi FK (requirements)
**Nguyên nhân:** FK `requirements.document_id → documents.id` — xóa document khi còn requirements.  
**Fix:** Xóa requirements trước trong `file_service.py`.

### Bug 3: Generate test cases → 400 "Database save failed"
**Nguyên nhân 1:** Bảng `test_cases` thiếu cột (schema cũ không có `document_id`, v.v.).  
**Fix:** Thêm `_ensure_test_case_columns()` với `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

**Nguyên nhân 2:** Cột `test_data` trong DB cũ có type `JSON`, nhưng model mới là `Text`.  
PostgreSQL từ chối `"Email: test@example.com"` vì không phải JSON hợp lệ.  
**Fix:** `ALTER TABLE test_cases ALTER COLUMN test_data TYPE TEXT USING test_data::TEXT`

### Bug 4: Delete document lỗi FK (test_cases)
**Nguyên nhân:** Sau khi thêm `test_cases`, delete chưa xóa test_cases trước.  
**Fix:** Xóa theo thứ tự: `test_cases → requirements → documents`.

---

## Trạng thái hiện tại

- ✅ Backend UC04 hoàn chỉnh
- ✅ Frontend có nút Generate Test Cases + panel hiển thị
- ✅ DB migration idempotent (restart backend là tự fix schema)
- ✅ AgentLog ghi lại mọi lần AI chạy
- ⏳ Chưa làm: Review/Approve/Reject test case (PATCH endpoint) — để scope sau
- ⏳ Chưa làm: Export test cases (Excel/CSV)
- ⏳ API key Gemini cần được điền vào `.env`

---

## Cách tiếp tục

### Restart backend
```bash
cd backend
uvicorn app.main:app --reload
```

### Endpoints đang có
```
# Documents
GET    /api/documents
POST   /api/documents/upload
DELETE /api/documents
DELETE /api/documents/selected
GET    /api/documents/{id}
POST   /api/documents/{id}/extract-text

# Requirements
POST   /api/v1/documents/{document_id}/requirements/generate
GET    /api/v1/requirements/{requirement_id}/test-cases
POST   /api/v1/requirements/{requirement_id}/test-cases/generate

# AI health
GET    /api/v1/ai/health
```

### Luồng test thủ công
1. Upload document (PDF/DOCX/MD)
2. Bấm "Preview Text" để extract text
3. Bấm "Generate Requirements" (document phải có status `completed`)
4. Trong panel requirements, bấm **⚡ Generate Test Cases** trên từng requirement
5. Bấm **▼ Show** để xem test cases

### Scope tiếp theo (gợi ý)
- UC04b: PATCH `/api/v1/test-cases/{id}` — update status (approve/reject/review)
- UC05: Export test cases approved ra Excel/CSV
- UC06: Project management (tạo project, gán document vào project)
