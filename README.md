# AI Test Case Generation Assistant

MVP hien tai cua project tap trung vao chuc nang upload tai lieu len backend Python va quan ly danh sach file da upload tren frontend React.

Chua co AI, chua extract text, chua sinh requirement/test case.

## Tech Stack

Backend:
- Python
- FastAPI
- Uvicorn
- Local file storage trong `backend/uploads`
- Metadata local trong `backend/uploads/documents.json`

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

### Clear upload history

```http
DELETE /api/documents
```

Dung cho moi truong test. API nay xoa metadata va cac file da upload trong `backend/uploads`, giu lai `.gitkeep`.

## Chay Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend mac dinh chay tai:

```text
http://localhost:8000
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
