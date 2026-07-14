# AI Test Case Generation Assistant (TCGA)

Công cụ AI hỗ trợ BA / QA tự động hoá việc phân tích tài liệu yêu cầu (SRS, BA doc) và sinh test case theo chuẩn xuất Excel.

## Tech Stack

**Backend** — FastAPI + Python
- Text extraction: `pdfplumber`, `python-docx`, `openpyxl`
- AI Provider abstraction: hỗ trợ OpenAI-compatible endpoint (vd. `api.vilao.ai`)
- Database: PostgreSQL (Supabase) qua SQLAlchemy, SQLite cho agent loop (`claude/`)
- Preprocessing pipeline: extract → clean → section-based structure

**Frontend** — React + TypeScript + Vite
- Dark/light mode toggle (lưu localStorage)
- Test case hiển thị dạng bảng phẳng 8 cột, có nút Export Excel

**Agent UI** — Streamlit (`claude/`)
- 3-cột: Sources | Chat | Studio
- Agent loop sử dụng OpenAI tool calling

---

## Chức Năng Hiện Tại

### Upload & Extract
- Upload `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `zip`
- Auto extract text khi upload, lưu vào database
- Preview trích xuất tối đa 5.000 ký tự

### AI Requirement Generation
- Gọi LLM sinh requirements từ extracted text
- Lưu từng requirement vào database (versioned)
- Frontend hiển thị: functional requirement, validation rules, workflow, error handling, confidence score

### AI Test Case Generation
- Sinh test case từ requirement đã extract
- Output bảng phẳng 8 cột: **Feature | Test Case ID | Test Item | Precondition | Test Steps | Test Data | Expected Output | Note**
- Không merge cell, không block thống kê QA, không ma trận trình duyệt
- Export ra file `.xlsx` trực tiếp từ UI

### Agent Loop (`claude/` — Streamlit)
- BA Agent chat với tài liệu đã upload
- Tools: `save_requirement`, `save_test_case`, `search_document`
- SQLite local DB (`ba_agent.db`) — schema tách biệt với backend PostgreSQL
- Export test case từ tab Studio

---

## Cấu Trúc Thư Mục

```text
backend/
  app/
    main.py
    models.py
    routers/          # documents, requirements, test_cases, ai
    schemas/
    services/
      ai/             # provider abstraction, openai_compatible_provider
      extractors/     # pdf, docx, xlsx, txt extractors
      file_service.py
      requirement_generation_service.py
      test_case_generation_service.py
  uploads/
  requirements.txt

frontend/
  src/
    App.tsx           # theme toggle (dark/light)
    styles.css        # design tokens Zinc/Emerald
    components/
      DocumentUpload.tsx
      DocumentList.tsx  # bảng test case 8 cột + export

claude/
  app.py            # Streamlit UI 3 cột
  agent.py          # agent loop + tool definitions
  database.py       # SQLite schema (requirement, test_case, session)
  preprocessor.py   # extract → clean → structure sections
  uploads/          # tài liệu upload cho agent
  CLAUDE.md         # kiến trúc và quyết định đã chốt
```

---

## API Chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/documents/upload` | Upload file |
| `GET` | `/api/documents` | Danh sách documents |
| `GET` | `/api/v1/documents/{id}` | Chi tiết + preview 5000 chars |
| `POST` | `/api/v1/documents/{id}/requirements/generate` | Sinh requirements từ text |
| `GET` | `/api/v1/requirements/{id}/test-cases` | Lấy test cases |
| `POST` | `/api/v1/requirements/{id}/test-cases/generate` | Sinh test cases từ requirement |
| `GET` | `/api/v1/requirements/{id}/test-cases/export` | Export Excel 8 cột |
| `GET` | `/api/v1/ai/health` | Kiểm tra kết nối AI provider |

---

## Chạy Backend

```bash
cd backend
copy .env.example .env   # điền DATABASE_URL và AI provider config
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Ví dụ `.env` với OpenAI-compatible provider:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
AI_PROVIDER=openai_compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.vilao.ai/v1
OPENAI_COMPATIBLE_API_KEY=your_key
OPENAI_COMPATIBLE_MODEL=ram/gemini-3.5-flash-low
```

Backend chạy tại: `http://localhost:8000`

---

## Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại: `http://localhost:5173`

---

## Chạy Agent UI (Streamlit)

```bash
cd claude
pip install -r requirements.txt
python -m streamlit run app.py
```

---

## Ghi Chú

- `uvicorn.exe` có thể bị chặn bởi Device Guard — dùng `python -m uvicorn` thay thế.
- DB schema của `claude/` (SQLite) và `backend/` (PostgreSQL) là hai hệ thống tách biệt, không share.
- Kiến trúc và quyết định thiết kế cho agent loop được ghi chi tiết trong `claude/CLAUDE.md`.
