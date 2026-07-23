# AI Test Case Generation Assistant (TCGA)

Công cụ AI hỗ trợ BA / QA tự động hoá việc phân tích tài liệu yêu cầu (SRS, BA doc) và sinh test case theo chuẩn xuất Excel.

## Tech Stack

**Backend** — FastAPI + Python
- Text extraction & Vectorization: `pdfplumber`, `python-docx`, `openpyxl`, `langchain` text splitters
- AI Provider abstraction: hỗ trợ OpenAI-compatible endpoint (vd. `api.vilao.ai`)
- Database: PostgreSQL (Supabase) + `pgvector` qua SQLAlchemy
- Preprocessing pipeline: extract → Markdown Header Chunking (chia theo Heading cấp độ, fallback size=1500) → embedding (1536 chiều) → RAG retrieval

**Frontend** — React + TypeScript + Vite
- Giao diện UI/UX tối ưu theo hướng hiện đại (Hover effect xanh lá đặc trưng, bo góc, bóng đổ).
- Hỗ trợ render Markdown đa dạng bao gồm cả Table phức tạp và HTML tag (tích hợp `rehype-raw`).
- Khung quản lý tài liệu (Context) tự động nhận diện định dạng file và hiển thị bộ logo 3D tương ứng.
- Dark/light mode toggle (lưu localStorage).
- Test case hiển thị dạng bảng phẳng 6-7 cột (fixed layout), chống vỡ khung, có nút Export Excel.

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
- Lấy thêm bối cảnh (**Top-15 Chunks** trong Project) bằng query dựa trên Requirement Title + Description để bổ sung ngữ cảnh cho LLM
- Output bảng phẳng 7 cột: **Feature | Test Case ID | Test Item | Precondition | Test Steps | Test Data | Expected Output**
- Cột *Test Item* hiển thị mục đích/ngữ cảnh test case bằng ngôn ngữ tự nhiên.
- Không merge cell, không block thống kê QA, không ma trận trình duyệt
- Export ra file `.xlsx` trực tiếp từ UI

### AI Chat Workspace / Copilot (Mới)
- Không gian tương tác trực tiếp với Agent AI thông qua giao diện Chat.
- Cung cấp các nút Hành Động Nhanh (Quick Actions): Phân tích tài liệu, Tạo Requirement, Tạo Test Case.
- AI Agent (ReAct) tự động gọi các công cụ (Tools) backend tương ứng, thao tác DB và format kết quả chi tiết dưới dạng Markdown ngay trong khung chat.

---

## Cấu Trúc Thư Mục

```text
backend/
  app/
    main.py
    models.py
    routers/          # documents, requirements, test_cases, ai, chat
    schemas/
    services/
      agent/          # LangGraph ReAct agents & workflows
      ai/             # provider abstraction, openai_compatible_provider
      extractors/     # pdf, docx, xlsx, txt extractors
      chunk_storage_service.py 
      embedding_service.py     
      retrieval_service.py     
      file_service.py
      requirement_generation_service.py
      test_case_generation_service.py
      chat_service.py # Xử lý logic hội thoại
  uploads/
  requirements.txt

frontend/
  src/
    App.tsx           # theme toggle (dark/light) & layout chính
    styles.css        # design tokens Zinc/Emerald
    components/
      DocumentUpload.tsx
      DocumentList.tsx  
      ChatWorkspace.tsx # Giao diện Chat Copilot & Quick Actions
      DocumentContextSidebar.tsx # Quản lý tài liệu context cho chat
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
| `POST` | `/api/chat/message` | AI Chat Agent - Nhận tin nhắn và gọi tools |
| `GET` | `/api/v1/ai/health` | Kiểm tra kết nối AI provider |

---

## Cách Khởi Chạy Dự Án

Dự án hiện tại được tối ưu hóa để khởi chạy hoàn toàn thông qua **Docker**.

Yêu cầu: Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Tại thư mục gốc của dự án, thiết lập file biến môi trường (nếu cần đổi API Key):
   Tạo hoặc chỉnh sửa `.env` trong thư mục `backend/` (tham khảo `.env.example`).
   
2. Mở Terminal và chạy lệnh:
   ```bash
   docker-compose up --build
   ```

3. Mở trình duyệt và truy cập:
   - **Giao diện người dùng (Frontend):** `http://localhost:5173`
   - **Tài liệu API Backend (Swagger UI):** `http://localhost:8000/docs`

> **Lưu ý:** Cơ sở dữ liệu PostgreSQL (`pgvector`) đã được tích hợp sẵn và tự động khởi tạo khi chạy lệnh Docker. Mọi thay đổi đối với file cấu hình `.env` trong thư mục `backend/` sẽ tự động được Docker nạp vào hệ thống. Cấu hình mặc định đã sử dụng mô hình OpenAI-compatible của Vilao.
