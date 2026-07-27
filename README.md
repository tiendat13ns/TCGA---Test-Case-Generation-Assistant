# AI Test Case Generation Assistant (TCGA)

Công cụ AI hỗ trợ BA / QA tự động hoá việc phân tích tài liệu yêu cầu (SRS, BA doc) và sinh test case theo chuẩn xuất Excel.

## Tech Stack

**Backend** — FastAPI + Python
- Text extraction & Vectorization: `pdfplumber`, `python-docx`, `openpyxl`, `langchain` text splitters
- AI Provider abstraction: hỗ trợ OpenAI-compatible endpoint (vd. `api.vilao.ai`)
- Database: PostgreSQL (Supabase) + `pgvector` qua SQLAlchemy
- Preprocessing pipeline: extract → Markdown Header Chunking (chia theo Heading cấp độ, fallback size=1500) → embedding (1536 chiều) → RAG retrieval

**Frontend** — React + TypeScript + Vite
- Quản lý trạng thái và bộ nhớ đệm (Caching/State Management) mạnh mẽ với **React Query (@tanstack/react-query)**, tối ưu số lượng gọi API (gọi 1 lần/phiên) và trải nghiệm Instant Navigation.
- Giao diện UI/UX tối ưu theo hướng hiện đại (Hover effect xanh lá đặc trưng, bo góc, bóng đổ).
- Hỗ trợ render Markdown đa dạng bao gồm cả Table phức tạp và HTML tag (tích hợp `rehype-raw`).
- Khung quản lý tài liệu (Context) tự động nhận diện định dạng file và hiển thị bộ logo 3D tương ứng.
- Dark/light mode toggle (lưu localStorage).
- Test case hiển thị dạng bảng phẳng 6-7 cột (fixed layout), chống vỡ khung, có nút Export Excel.

---

## Chức Năng Hiện Tại

### Quản Lý Dự Án (Project-centric Dashboard)
- **Màn hình Tổng Quan Dự Án:** Quản lý tập trung các dự án dưới dạng lưới (Grid View).
- **Thống kê chi tiết:** Hiển thị thời gian khởi tạo dự án và tổng hợp số lượng File, Requirement, số bộ Test Case đã được AI sinh ra cho từng dự án.
- **RAG Context Isolation:** AI Semantic Search được giới hạn nghiêm ngặt ở cấp độ Project. Tài liệu của dự án này không trộn lẫn với dự án khác, nhưng các tài liệu trong cùng dự án có thể tham chiếu lẫn nhau (cross-reference) để làm rõ ngữ cảnh.

### Upload & Extract
- Upload `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `zip`
- Auto extract text khi upload, lưu vào database
- Preview trích xuất tối đa 5.000 ký tự

### AI Requirement Generation (Tích hợp RAG)
- Nhúng toàn bộ tài liệu (Embedding) bằng model embedding.
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

### AI Chat Workspace / Copilot
- Không gian tương tác trực tiếp với Agent AI thông qua giao diện Chat.
- AI Workspace chia màn hình thông minh: Giao diện Chat ở giữa và Bảng ngữ cảnh (Document Context Sidebar) bên phải để dễ dàng chọn lọc file làm nguồn tri thức cho AI.
- Cung cấp các nút Hành Động Nhanh (Quick Actions).
- AI Agent (ReAct) tự động gọi các công cụ (Tools) backend tương ứng, thao tác DB và format kết quả chi tiết dưới dạng Markdown ngay trong khung chat.

---

## Cấu Trúc Thư Mục

```text
backend/
  app/
    main.py
    models.py
    routers/          # documents, requirements, test_cases, ai, chat, projects
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
    App.tsx           # routing (Overview / Projects / Dashboard)
    styles.css        # design tokens
    hooks/            # Custom hooks cho React Query (useProjects, useDocuments)
    components/
      ProjectsGrid.tsx 
      ProjectManager.tsx
      ProjectDetailDashboard.tsx
      DocumentUpload.tsx
      DocumentList.tsx  
      ChatWorkspace.tsx 
      DocumentContextSidebar.tsx 
```

---

## API Chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/projects` | Danh sách projects (kèm thống kê files/reqs/tests) |
| `POST`| `/api/v1/projects` | Tạo project mới |
| `DELETE`|`/api/v1/projects/{id}`| Xóa toàn bộ project và dữ liệu liên quan |
| `POST` | `/api/documents/upload` | Upload file (yêu cầu project_id) |
| `GET` | `/api/documents?project_id=...` | Danh sách documents của một project |
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
   docker-compose up -d --build
   ```

3. Mở trình duyệt và truy cập:
   - **Giao diện người dùng (Frontend):** `http://localhost:1302`
   - **Tài liệu API Backend (Swagger UI):** `http://localhost:1303/docs`

> **Lưu ý:** Nếu bạn vừa thay đổi Frontend package (như `npm install`), hãy build lại không dùng cache: `docker-compose build --no-cache frontend` rồi chạy lại `docker-compose up -d frontend`.
