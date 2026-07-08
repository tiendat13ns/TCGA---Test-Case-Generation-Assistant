SOFTWARE REQUIREMENTS SPECIFICATION

AI Test Case Generation Assistant

Project SRS - ưu tiên luồng Upload Document -\> Requirement Extraction
-\> AI Test Case Generation

1.  Giới thiệu

Tài liệu này mô tả yêu cầu phần mềm cho hệ thống AI Test Case Generation
Assistant. Hệ thống hỗ trợ BA/Tester upload tài liệu đặc tả, trích xuất
requirement bằng AI, sinh test case có cấu trúc, review và export kết
quả. Trọng tâm MVP là ba use case chính: Document Upload and Management,
Requirement Extraction, Request AI Test Case Generation.

1.1 Mục tiêu hệ thống

Giảm thời gian Tester phải đọc nhiều tài liệu BRD, SRS, User Story, API
Spec và viết test case thủ công.

Chuẩn hóa requirement và test case theo schema để có thể lưu DB, review,
versioning và export.

Duy trì traceability từ Document -\> Requirement -\> Test Case -\>
Export History.

Tách rõ vai trò AI Agent và Backend: AI chỉ phân tích/sinh dữ liệu;
Backend validate schema, lưu DB và kiểm soát quyền.

1.2 Phạm vi MVP

1.3 Ngoài phạm vi MVP

Tích hợp Jira/TestRail/Xray hai chiều.

Collaborative editing realtime.

Fine-tuning model riêng.

OCR nâng cao cho scan PDF chất lượng thấp.

Tự động chạy test automation hoặc sinh automation script hoàn chỉnh.

2.  Tổng quan người dùng và vai trò

3.  Rà soát và chuẩn hóa Use Case

Bộ UC hiện tại đã bao phủ đúng luồng nghiệp vụ nhưng có một số điểm cần
thống nhất để dev triển khai không bị lệch logic.

4.  Luồng nghiệp vụ tổng thể

4.1 Core workflow

User đăng nhập vào hệ thống.

Tester/BA tạo hoặc mở Project active.

Tester/BA upload tài liệu đặc tả vào Project.

Backend kiểm tra file type, file size, quyền truy cập và trạng thái
project.

Backend lưu file vào storage, tạo document record, chuyển status
uploaded -\> processing.

Extract Engine trích xuất text; nếu thành công status = completed, nếu
lỗi status = failed.

Tester chọn document completed và yêu cầu AI Extract Requirements.

Backend gửi extracted_text tới AI Agent, nhận structured requirements,
validate schema và lưu DB.

Tester review/edit/approve/reject requirement nếu cần.

Tester chọn requirement hợp lệ và yêu cầu AI Generate Test Cases.

Backend gửi requirement context tới AI Agent, nhận danh sách test case,
validate schema và lưu DB.

Tester review/edit/approve/reject test case.

Tester export test case approved ra Excel/CSV nếu cần.

4.2 Mermaid sequence - core 3 UC

Có thể dùng đoạn Mermaid dưới đây trong Markdown/Draw.io để dựng nhanh
sequence diagram:

5.  Yêu cầu chức năng chi tiết

5.1 UC02 - Document Upload and Management

Functional requirements cho UC02

5.2 UC03 - Requirement Extraction

Functional requirements cho UC03

5.3 UC04 - Request AI Test Case Generation

Functional requirements cho UC04

5.4 Các UC hỗ trợ

6.  Data Requirements

SRS sử dụng DBML hiện tại làm baseline. Các entity chính cần giữ quan hệ
traceability như sau: users -\> projects -\> documents -\> requirements
-\> test_cases -\> export_history; agent_logs và
review_histories/audit_logs phục vụ debug, review và governance.

7.  AI Output Schema yêu cầu

7.1 Requirement JSON schema tối thiểu

{ "requirements": \[ { "title": "string", "description": "string",
"module": "string\|null", "feature": "string\|null", "actor":
"string\|null", "business_rule": "string\|null", "input_data":
"string\|null", "output_data": "string\|null", "preconditions":
"string\|null", "validation_rule": "string\|null", "exception_flow":
"string\|null", "source_reference": "string", "confidence_score": 0.0 }
\] }

7.2 Test Case JSON schema tối thiểu

{ "test_cases": \[ { "requirement_id": 123, "title": "string",
"scenario": "string\|null", "preconditions": "string\|null",
"test_steps": \["step 1", "step 2"\], "test_data": "string\|null",
"expected_result": "string", "priority": "High\|Medium\|Low",
"severity": "Critical\|Major\|Minor\|Trivial\|null", "test_type":
"Positive\|Negative\|Boundary\|Validation\|Integration\|Security\|Other",
"automation_candidate": false, "execution_type": "Manual\|Automation
Candidate" } \] }

8.  Non-functional Requirements

9.  API Contract gợi ý mức SRS

10. Acceptance Criteria tổng hợp cho MVP

User đăng nhập được và thao tác theo role.

Tester/BA upload được file hợp lệ vào project active.

File sai định dạng hoặc \>20MB bị từ chối.

Document có status rõ ràng và chỉ completed mới dùng để extract
requirement.

AI extract requirement trả về schema hợp lệ và Backend validate trước
khi lưu.

Requirement có source_reference và confidence_score.

Tester có thể review/edit/approve/reject requirement.

Tester generate được test case từ requirement hợp lệ theo rule MVP.

AI test case response thiếu title/steps/expected_result không được lưu.

Test case liên kết requirement và có status
ai_generated/reviewed/approved/rejected/exported.

Tester có thể review/edit/approve/reject test case.

Approved test case có thể export Excel/CSV và lưu export history.

Mọi lần AI chạy có AgentLog để debug và thống kê chi phí.

11. Rủi ro và khuyến nghị triển khai

12. Kết luận

Bộ UC hiện tại đủ cơ sở để dev triển khai MVP. Trọng tâm kỹ thuật cần
làm chắc là pipeline Document Upload -\> Extract Text -\> Requirement
Extraction -\> Test Case Generation, trong đó Backend phải kiểm soát
state machine, validate AI schema và lưu traceability. Sau khi SRS này
ổn định, bước tiếp theo nên là API Contract chi tiết gồm
request/response mẫu, status code, error code và validation rule cho
từng endpoint.
