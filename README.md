# AI Test Case Generation Assistant (TCGA)

Hệ thống AI thông minh hỗ trợ BA / QA tự động hóa việc phân tích tài liệu yêu cầu (SRS, BA/Doc) và tự động sinh bộ Test Case theo chuẩn xuất Excel.

---

## Chức Năng Nổi Bật

### 1. Màn Hình Tổng Quan & Quản Lý Dự Án (Project-centric Dashboard)
- **Mặc định khi đăng nhập**: Tự động điều hướng người dùng tới trang **Overview (`/overview`)**.
- **Quản lý tập trung**: Quản lý các dự án dưới dạng lưới (Grid View), hiển thị thống kê tổng số Tài liệu, Requirement và bộ Test Case.
- **Phân vùng tri thức (RAG Isolation)**: Tìm kiếm ngữ cảnh Semantic Search được cô lập theo từng Dự án (Project), đảm bảo dữ liệu không bị trộn lẫn giữa các dự án.

### 2. Xác Thực Người Dùng & Quản Lý Tài Khoản (Authentication)
- **Xác thực JWT siêu tốc**: Đăng nhập / Đăng ký tài khoản an toàn với cơ chế xác thực JWT nội bộ loại bỏ độ trễ.
- **User Profile Menu**: Hiển thị thông tin tài khoản, avatar và thanh progress bar credit (số dư / quota gói hiện tại) ngay trong Sidebar trái — không còn thanh điều hướng trên cùng riêng biệt.
- **Credit áp dụng đồng nhất cho mọi role**: Admin không có cơ chế bypass — được xếp vào bậc Pro Plan qua ngưỡng credit_balance như user thường, vẫn bị trừ credit khi dùng tính năng AI.
- **Tối ưu giao diện Form**: Đồng bộ tone màu Warm Beige, tương thích hoàn hảo với tính năng Autofill của trình duyệt (Chrome/Edge/Safari).

### 3. Tối Ưu Caching & State Management (React Query)
- **Toàn bộ ứng dụng** (Projects, Documents, Requirements, Test Cases, Usage) được tái cấu trúc sử dụng **React Query (`@tanstack/react-query`)**.
- Tự động làm mới dữ liệu chạy ngầm (Auto-refetch background), lưu cache thông minh giúp chuyển trang tức thì (Instant Navigation) và giảm tải số lần gọi API.

### 4. Upload & Trích Xuất Yêu Cầu (AI Requirement Generation)
- Hỗ trợ đa dạng định dạng file: `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `zip`.
- Tìm kiếm ngữ cảnh liên quan nhất (RAG Semantic Search) để tạo ra tập **Comprehensive Requirement** đầy đủ, không bị xé lẻ.
- Tự động đồng bộ ngôn ngữ đầu ra theo ngôn ngữ của tài liệu.

### 5. Sinh Test Case Tự Động & Xuất Excel (AI Test Case Generation)
- Sinh bộ Test Case chuẩn QA 7 cột: **Feature | Test Case ID | Test Item | Precondition | Test Steps | Test Data | Expected Output**.
- **Chỉ sinh test case Black-box chức năng** (Positive/Negative/Boundary/Validation/Integration) — không sinh white-box/code-level, performance/load, hay penetration-testing/security-exploit test, vì tester chỉ có tài liệu, không có quyền truy cập source code.
- Số lượng test case co giãn theo độ phức tạp của Requirement thay vì áp một con số cố định.
- Xuất file báo cáo Excel (`.xlsx`) chuyên nghiệp trực tiếp từ giao diện.

### 6. Test Case Studio (Chỉnh Sửa Hàng Loạt)
- Giao diện quản lý tập trung theo luồng **Projects > Documents > Test Cases**.
- **Global Bulk Edit**: Cho phép chỉnh sửa trực tiếp hàng loạt dòng Test Case như một bảng dữ liệu liền mạch, lưu đa luồng tốc độ cao.
- Bộ lọc động theo Trạng thái (Status), Độ ưu tiên (Priority), Loại (Type).

### 7. AI Chat Workspace & Trải Nghiệm Giao Diện Warm Beige
- **Tone màu chủ đạo Warm Beige**: Thiết kế hiện đại, tinh tế, loại bỏ nút chuyển Dark/Light mode để giữ tính đồng nhất cao cấp.
- **Hiệu ứng Dissolve Fade-out**: Khung chat hỗ trợ hiệu ứng mờ tan gradient mượt mà ở viền dưới khi cuộn tin nhắn.
- **Quick Actions**: Các nút thao tác nhanh (Phân tích tổng quan, Tạo Requirement, Tạo Test Case).

---

## Tech Stack

**Backend** — FastAPI + Python 3.12
- DB: PostgreSQL + `pgvector` (Supabase) qua SQLAlchemy
- AI Provider: chỉ hỗ trợ OpenAI-compatible API (Gemini/GPT/... qua proxy tương thích chuẩn OpenAI) — đã bỏ hỗ trợ Ollama local.
- Text extraction & Vectorization: `pdfplumber`, `python-docx`, `openpyxl`, `langchain` text splitters
- Preprocessing pipeline: Chunking theo Heading (Word Heading style, đoạn bôi đậm, hoặc cỡ chữ với PDF) → Embedding (1536 chiều) → RAG retrieval
- Sinh Requirement/Test Case ưu tiên dùng Structured Output (function-calling), tự fallback về parse JSON thủ công nếu model/proxy không hỗ trợ.

**Frontend** — React 18 + TypeScript + Vite
- Caching & Data Fetching: **React Query (@tanstack/react-query)**
- Styling: Vanilla CSS với Design System Warm Beige + CSS Variables
- Icons & Markdown: `lucide-react`, `react-markdown`, `remark-gfm`, `rehype-raw`

---

## API Chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/auth/login` | Đăng nhập tài khoản, nhận JWT token |
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện tại |
| `GET` | `/api/v1/projects` | Danh sách projects (kèm thống kê) |
| `POST`| `/api/v1/projects` | Tạo project mới |
| `DELETE`|`/api/v1/projects/{id}`| Xóa project và toàn bộ dữ liệu |
| `POST` | `/api/documents/upload` | Upload file tài liệu vào project |
| `GET` | `/api/documents?project_id=...` | Danh sách tài liệu của project |
| `GET` | `/api/v1/documents/{id}` | Xem chi tiết & preview tài liệu |
| `POST` | `/api/v1/documents/{id}/requirements/generate` | Sinh requirements từ tài liệu |
| `GET` | `/api/v1/requirements/{id}/test-cases` | Lấy danh sách test cases |
| `POST` | `/api/v1/requirements/{id}/test-cases/generate` | Sinh test cases từ requirement |
| `GET` | `/api/v1/test-cases` | Danh sách test cases (lọc linh hoạt) |
| `PUT` | `/api/v1/test-cases/{id}` | Cập nhật nội dung một test case |
| `GET` | `/api/v1/test-cases/export` | Export danh sách test cases ra Excel |
| `POST` | `/api/chat/message` | AI Chat Agent - Phân tích & gọi công cụ |
| `GET` | `/api/usage/summary` | Thông tin tổng quan tài khoản & gói sử dụng |
| `GET` | `/api/usage/logs` | Lịch sử hoạt động người dùng |

---

## Khởi Chạy Dự Án (Docker)

Dự án hiện tại được tối ưu hóa để khởi chạy hoàn toàn thông qua **Docker**.

Yêu cầu: Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. **Chuẩn bị file môi trường:**
   Tạo file `.env` tại thư mục `backend/` (tham khảo `.env.example`).

2. **Chạy ứng dụng bằng Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Truy cập:**
   - **Frontend:** `http://localhost:1302`
   - **Backend Swagger Docs:** `http://localhost:1303/docs`
