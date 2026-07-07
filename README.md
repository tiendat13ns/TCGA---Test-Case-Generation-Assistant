# AI Test Case Generation Assistant

MVP hien tai cua project tap trung vao chuc nang upload tai lieu len backend Python va quan ly danh sach file da upload tren frontend React.

Chua co AI, chua extract text, chua sinh requirement/test case.

## Tech Stack

Backend:
- Python
- FastAPI
- Uvicorn
- Local file storage trong `backend/uploads`
- Supabase PostgreSQL cho metadata khi `DATABASE_URL` duoc cau hinh
- Fallback metadata local trong `backend/uploads/documents.json` khi chua cau hinh database
- Text extraction cho `pdf`, `docx`, `txt`, `md`, `xlsx`

Frontend:
- React
- TypeScript
- Vite

## Chuc Nang Hien Tai

Upload document:
- Upload 1 file hoac nhieu file cung luc.
- Upload 1 file `.zip`; backend se doc va luu cac file hop le ben trong zip.
- Hien danh sach file user da chon truoc khi upload.
- Co the bo bot file khoi danh sach chon bang nut `Remove`.
- Hien thong bao upload thanh cong mau xanh la cay.
- File vua upload hien ngay trong `Uploaded Documents`, khong can reload web.
- Khi `DATABASE_URL` duoc cau hinh, upload thanh cong se tu extract text, luu text vao database, xoa file local sau khi extract, va cap nhat status:
  - `uploaded`
  - `processing`
  - `completed`
  - hoac `failed`

Extract text:
- PDF dung `pdfplumber`.
- DOCX dung `python-docx`, doc paragraphs va tables.
- TXT/MD doc plain text.
- XLSX dung `openpyxl`, doc tat ca worksheets.
- Khong OCR, khong AI.
- File upload chi duoc luu tam thoi de extract, sau do bi xoa. User xem lai noi dung qua preview lay tu database.

Quan ly uploaded documents:
- Hien danh sach file da upload.
- File moi nhat hien o tren dau.
- Filter theo:
  - ten file
  - type
  - size min/max theo KB
  - status
  - time: newest first / oldest first
- Xoa lich su upload bang nut `Clear History` cho moi truong test.

Validate file:
- Khong cho upload file rong.
- Gioi han dung luong moi file toi da 10MB.
- Chi cho phep cac dinh dang:
  - `pdf`
  - `docx`
  - `txt`
  - `md`
  - `xlsx`
  - `csv`
  - `dbml`
  - `zip`
- File ben trong zip chi duoc phep la cac dinh dang document hop le: `pdf`, `docx`, `txt`, `md`, `xlsx`, `csv`, `dbml`.
- Backend chan path khong an toan trong zip.

## Cau Truc Thu Muc

```text
backend/
  app/
    main.py
    routers/
      documents.py
    schemas/
      document_schema.py
    services/
      file_service.py
  uploads/
    .gitkeep
    documents.json
  requirements.txt

frontend/
  src/
    App.tsx
    main.tsx
    styles.css
    components/
      DocumentUpload.tsx
      DocumentList.tsx
  package.json
  vite.config.ts
```

## API

### Upload documents

```http
POST /api/documents/upload
```

Content type:

```text
multipart/form-data
```

Form field:

```text
files
```

Response thanh cong:

```json
[
  {
    "id": "uuid",
    "original_filename": "SRS.docx",
    "stored_filename": "uuid_SRS.docx",
    "file_type": "docx",
    "file_size": 123456,
    "file_path": "uploads/uuid_SRS.docx",
    "status": "uploaded",
    "uploaded_at": "2026-07-06T09:00:00"
  }
]
```

### List uploaded documents

```http
GET /api/documents
```

Tra ve danh sach file da upload, sap xep moi nhat truoc.

### Get document detail

```http
GET /api/documents/{document_id}
```

Tra ve metadata, status, `text_length`, va `preview` 500 ky tu dau. Khong tra full `extracted_text`.

### Extract text manually

```http
POST /api/documents/{document_id}/extract-text
```

Chay lai text extraction cho document da upload.

### Clear upload history

```http
DELETE /api/documents
```

Dung cho moi truong test. API nay xoa metadata va cac file da upload trong `backend/uploads`, giu lai `.gitkeep`.

## Chay Backend

Tao file `.env` tu `.env.example` va dien connection string Supabase:

```bash
cd backend
copy .env.example .env
```

Vi du:

```env
DATABASE_URL=postgresql://postgres:<YOUR-PASSWORD>@db.<YOUR-PROJECT-REF>.supabase.co:5432/postgres
```

Neu password co ky tu dac biet, can percent-encode trong connection string. Vi du `#` thanh `%23`.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend mac dinh chay tai:

```text
http://localhost:8000
```

Kiem tra ket noi database:

```text
http://localhost:8000/health/db
```

## Chay Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay tai:

```text
http://localhost:5173
```

## CORS

Backend cho phep frontend goi API tu:

```text
http://localhost:3000
http://localhost:5173
```

## Ghi Chu Development

- `backend/uploads` la local storage tam thoi cho MVP.
- `documents.json` la metadata store tam thoi, chua dung database.
- `backend/venv`, `frontend/node_modules`, `frontend/dist`, log file va generated upload files duoc ignore boi `.gitignore`.
