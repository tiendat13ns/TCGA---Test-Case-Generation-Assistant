# AI Test Case Generation Assistant (TCGA)

Công cụ AI hỗ trợ BA / QA tự động hoá việc phân tích tài liệu yêu cầu (SRS, BA doc) và sinh test case theo chuẩn xuất Excel.

## Tech Stack

**Backend** — FastAPI + Python
- Text extraction & Vectorization: `pdfplumber`, `python-docx`, `openpyxl`, `langchain` text splitters
- AI Provider abstraction: hỗ trợ OpenAI-compatible endpoint (vd. `api.vilao.ai`)
- Database: PostgreSQL (Supabase) + `pgvector` qua SQLAlchemy
- Preprocessing pipeline: extract → chunking (size=800, overlap=150) → embedding (1536 chiều) → RAG retrieval

**Frontend** — React + TypeScript + Vite
- Dark/light mode toggle (lưu localStorage)
- Test case hiển thị dạng bảng phẳng 7 cột, có nút Export Excel

---

## Chức Năng Hiện Tại

### Quản Lý Dự Án (Project-centric)
- Mỗi người dùng tạo Project trước khi upload tài liệu.
- RAG Context Isolation: AI Semantic Search được giới hạn nghiêm ngặt ở cấp độ Project (Project-level isolation). Tài liệu của dự án này không bị trộn lẫn với dự án khác, nhưng các tài liệu trong cùng dự án có thể liên kết (cross-reference) với nhau để bổ sung context.

### Upload & Extract
- Upload `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `zip`
- Auto extract text khi upload, lưu vào database
- Preview trích xuất tối đa 5.000 ký tự

### AI Requirement Generation (Tích hợp RAG)
- Nhúng toàn bộ tài liệu (Embedding) bằng mô hình của Vilao (ví dụ: `ram/gemini-3.5-flash-low`)
- Dùng truy vấn Semantic Search lấy ra **Top-12 Chunks** liên quan nhất trong toàn bộ Project.
- Gom nhóm toàn bộ context thành 1 Requirement tổng hợp, chi tiết (Comprehensive Requirement) không bị xé lẻ.
- Tự động nhận diện và đồng bộ ngôn ngữ đầu ra (Language matching).

### AI Test Case Generation (Tích hợp RAG)
- Sinh test case từ requirement đã extract
- Lấy thêm bối cảnh (**Top-5 Chunks** trong Project) bằng query dựa trên Requirement Title + Description để bổ sung ngữ cảnh cho LLM
- Output bảng phẳng 7 cột: **Feature | Test Case ID | Test Item | Precondition | Test Steps | Test Data | Expected Output**
- Cột *Test Item* hiển thị mục đích/ngữ cảnh test case bằng ngôn ngữ tự nhiên.
- Không merge cell, không block thống kê QA, không ma trận trình duyệt
- Export ra file `.xlsx` trực tiếp từ UI

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
      chunk_storage_service.py # Xử lý lưu vector vào pgvector
      embedding_service.py     # Gọi API lấy embedding vector
      retrieval_service.py     # Thực hiện Semantic Search (Cosine Distance)
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
      DocumentList.tsx  # bảng test case 7 cột + export
```

---

## API Chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/projects` | Danh sách projects |
| `POST`| `/api/v1/projects` | Tạo project mới |
| `POST` | `/api/documents/upload` | Upload file (yêu cầu project_id) |
| `GET` | `/api/documents` | Danh sách documents |
| `GET` | `/api/v1/documents/{id}` | Chi tiết + preview 5000 chars |
| `POST` | `/api/v1/documents/{id}/requirements/generate` | Sinh requirements từ text |
| `GET` | `/api/v1/requirements/{id}/test-cases` | Lấy test cases |
| `POST` | `/api/v1/requirements/{id}/test-cases/generate` | Sinh test cases từ requirement |
| `GET` | `/api/v1/requirements/{id}/test-cases/export` | Export Excel 7 cột |
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

## Ghi Chú

- `uvicorn.exe` có thể bị chặn bởi Device Guard — dùng `python -m uvicorn` thay thế.
