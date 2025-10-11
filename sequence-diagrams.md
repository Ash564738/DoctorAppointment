# HealthCare Platform - Authentication Sequence Diagrams
## 
Sequence Diagram: Đăng ký và đăng nhập.
-	Mục tiêu: Người dùng đăng ký hoặc đăng nhập vào hệ thống để sử dụng các chức năng.
-	Các bước:
•	Người dùng truy cập vào trang đăng ký/đăng nhập.
•	Nhập thông tin (email, mật khẩu; nếu đăng ký bổ sung họ tên, vai trò; nếu là Bác sĩ, điền chuyên khoa, kinh nghiệm, phí, khoa).
-	Hệ thống kiểm tra thông tin hợp lệ:
•	Nếu đăng ký thành công: Hash mật khẩu và lưu người dùng vào CSDL; nếu vai trò là Bác sĩ, tạo hồ sơ bác sĩ ở trạng thái chờ được chấp nhận; tạo thông báo chào mừng và quay về trang đăng nhập.
•	Nếu đăng nhập thành công: Chuyển hướng đến giao diện chính.
-	Trường hợp lỗi: Dữ liệu không hợp lệ hoặc thông tin sai → trả 400 và hiển thị thông báo lỗi.

## Sign Up (Registration) Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as React Frontend
    participant Validation as Validation Middleware
    participant Controller as User Controller
    participant UserModel as User Model
    participant DoctorModel as Doctor Model (if Doctor)
    participant NotificationModel as Notification Model
    participant Database as MongoDB
    participant BCrypt as BCrypt

    User->>Frontend: Fill registration form
    User->>Frontend: Select role (Patient/Doctor)
    
    alt Role is Doctor
        User->>Frontend: Fill doctor-specific fields
        Note over User,Frontend: specialization, experience, fees, department
    end
    
    User->>Frontend: Submit registration form
    Frontend->>Frontend: Client-side validation
    
    alt Validation fails
        Frontend->>User: Show validation errors
    else Validation passes
        Frontend->>Validation: POST /api/user/register
        
        Validation->>Validation: Validate request fields
        Note over Validation: firstname, lastname, email, password, role
        
        alt Server validation fails
            Validation->>Frontend: Return validation errors (400)
            Frontend->>User: Display error messages
        else Server validation passes
            Validation->>Controller: Call register function
            
            Controller->>Controller: Check if role is Admin
            alt Role is Admin
                Controller->>Frontend: Return 403 - Admin registration not allowed
                Frontend->>User: Show error message
            else Role is Patient/Doctor
                Controller->>Database: Check if email exists
                
                alt Email exists
                    Controller->>Database: Delete existing user
                end
                
                Controller->>UserModel: Create new user
                UserModel->>BCrypt: Hash password
                BCrypt->>UserModel: Return hashed password
                UserModel->>Database: Save user to database
                Database->>UserModel: Return saved user
                
                alt Role is Doctor
                    Controller->>DoctorModel: Create doctor profile
                    DoctorModel->>Database: Save doctor info
                    Note over DoctorModel,Database: isDoctor: false (pending approval)
                end
                
                Controller->>NotificationModel: Create welcome notification
                NotificationModel->>Database: Save notification
                
                Controller->>Frontend: Return success (201)
                Frontend->>User: Show success message
                Frontend->>Frontend: Navigate to login page
            end
        end
    end
```


## Shift Management – Diagrams

## Sequence Diagram: Quản lý ca làm (Shift Management).
-	Mục tiêu: Quản lý ca làm của bác sĩ: bác sĩ gửi yêu cầu ca (chờ duyệt), Admin có thể tạo ca trực tiếp, duyệt/từ chối yêu cầu, và bác sĩ có thể chặn/mở slot đặt lịch.
-	Các bước:
•	Bác sĩ mở trang “Schedule”, chọn nút "Create Shift", điền tiêu đề, bác sĩ có thể chọn sẵn các Preset có sẵn để tự động điền khung giờ, thời lượng slot, thời gian nghỉ rồi chọn ngày trong tuần sau đó gửi yêu cầu tạo ca.
•	Hệ thống kiểm tra tính hợp lệ (tiêu đề/giờ/ngày…). Nếu hợp lệ, tạo ca với trạng thái “Chờ duyệt (pending)” và gửi thông báo cho bác sĩ.
•	Admin mở mục “Shift Requests” để xem danh sách, Phê duyệt/Từ chối. Khi Phê duyệt, ca xuất hiện trong lịch tuần; khi Từ chối, hệ thống lưu lý do (nếu có) và thông báo cho bác sĩ.
•	Admin cũng có thể tạo ca trực tiếp cho một bác sĩ; ca này xuất hiện ngay trong lịch tuần (không qua bước chờ duyệt).
•	Bác sĩ có thể chặn/mở một slot cụ thể (kèm lý do) để tạm ngừng/cho phép nhận bệnh nhân ở khung giờ đó.
-	Trường hợp lỗi:
•	Người dùng không phải Bác sĩ gửi yêu cầu tạo ca → 403.
•	Dữ liệu không hợp lệ (thiếu hoặc sai định dạng tiêu đề/giờ/ngày) → 400.
•	Admin tạo ca cho bác sĩ không tồn tại → 404.
•	Chặn/Mở slot không thuộc quyền của bác sĩ hiện tại hoặc không tồn tại → 404.

### Create Shift → Admin Approval → Slot Management
```mermaid
sequenceDiagram
    participant Doctor as Doctor
    participant Admin as Admin
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as Shift Controller
    participant UserModel as User Model
    participant DoctorModel as Doctor Model
    participant Shift as Shift Model
    participant TimeSlot as TimeSlot Model
    participant Notification as Notification Model

    Note over Doctor,Frontend: Doctor requests a shift (goes to pending)
    Doctor->>Frontend: Fill shift details (title, time, daysOfWeek, break, etc.)
    Frontend->>Auth: POST /api/shift/create { ... }
    Auth->>Controller: createShift()
    Controller->>UserModel: findById(req.user._id)
    alt Not a Doctor
        Controller->>Frontend: 403 Only doctors can create shifts
    else Is Doctor
        Controller->>Shift: new Shift({ doctorId:req.user._id, ..., status:'pending', requestedBy:req.user._id })
        Shift-->>Controller: saved
        Controller->>Notification: create("Your shift request was submitted and is pending approval.")
        Notification-->>Controller: saved
        Controller->>Frontend: 201 { shift (status: pending) }
    end

    Note over Admin,Frontend: Admin creates a shift for a doctor (immediate schedule)
    Admin->>Frontend: Fill shift for a specific doctor
    Frontend->>Auth: POST /api/shift/admin-create/:doctorId { ... }
    Auth->>Controller: adminCreateShift()
    Controller->>DoctorModel: findById(params.doctorId)
    alt Doctor model not found
        Controller->>Frontend: 404 Doctor not found
    else Found
        Controller->>UserModel: findById(doctor.userId)
        alt User not a Doctor
            Controller->>Frontend: 404 Doctor user not found
        else OK
            Controller->>Shift: new Shift({ doctorId:userId, ... })
            Shift-->>Controller: saved
            Controller->>Frontend: 201 { shift (populated) }
        end
    end

    opt Toggle slot availability (block/unblock)
        Doctor->>Frontend: Toggle a slot (reason?)
        Frontend->>Auth: PATCH /api/shift/slot/:slotId/toggle { isBlocked, blockReason? }
        Auth->>Controller: toggleSlotAvailability()
        Controller->>TimeSlot: findOne({ _id:slotId, doctorId:req.user._id })
        alt Not found/unauthorized
            Controller->>Frontend: 404 Slot not found or unauthorized
        else OK
            Controller->>TimeSlot: update { isBlocked, isAvailable: !isBlocked && bookedPatients < maxPatients }
            TimeSlot-->>Controller: saved
            Controller->>Frontend: 200 { slot }
        end
    end
```

### Leave Request → Approval/Coverage

## 
Sequence Diagram: Xin nghỉ phép (Leave) và phân công người trực thay.
-	Mục tiêu: Cho phép bác sĩ xin nghỉ (đính kèm minh chứng), hệ thống chặn slot trong thời gian nghỉ và phân công đồng nghiệp trực thay (nếu có).
-	Các bước:
•	Bác sĩ điền loại nghỉ, khoảng thời gian, lý do, đánh dấu khẩn cấp (nếu có), và đề xuất đồng nghiệp có thể trực thay; tải kèm file chứng từ.
•	Hệ thống kiểm tra trùng lặp thời gian nghỉ đang chờ duyệt/đã duyệt, yêu cầu đề xuất người trực thay nếu không khẩn cấp; tạo yêu cầu nghỉ và thông báo cho Admin/đồng nghiệp.
•	Admin duyệt/Từ chối: Khi Duyệt, hệ thống chặn toàn bộ slot của bác sĩ trong khoảng nghỉ; nếu đã có đồng nghiệp chấp nhận trực thay, tự động tạo slot cho người đó theo cấu trúc ca sẵn có; gửi thông báo.
-	Trường hợp lỗi: Dữ liệu không hợp lệ → 400; Không có quyền hoặc yêu cầu đã xử lý → 403/400; Không tìm thấy yêu cầu → 404.

```mermaid
sequenceDiagram
    participant Staff as Staff (Doctor/Admin)
    participant Coverer as Covering Colleague
    participant Admin as Admin
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as Leave Controller
    participant Leave as LeaveRequest Model
    participant UserModel as User Model
    participant Shift as Shift Model
    participant TimeSlot as TimeSlot Model
    participant Notification as Notification Model

    Note over Staff,Frontend: Submit leave request (attachments, proposed coverers)
    Staff->>Frontend: Fill leaveType, startDate..endDate, reason, isEmergency, coveringStaffIds[]
    Frontend->>Auth: POST /api/leave/request
    Auth->>Controller: submitLeaveRequest()
    Controller->>UserModel: findById(req.user)
    alt Not Doctor/Admin
        Controller->>Frontend: 403 Only staff can submit leave
    else OK
        Controller->>Leave: check overlapping pending/approved requests
        alt Overlaps exist
            Controller->>Frontend: 400 Overlapping leave
        else No overlap
            alt Non-emergency without coverers
                Controller->>Frontend: 400 Need at least one covering colleague
            else Valid
                Controller->>Leave: create({ doctorId, leaveType, dates, reason, isEmergency })
                Leave-->>Controller: saved
                opt Notify requested coverers
                    Controller->>Notification: insertMany("requested coverage")
                end
                Controller->>Notification: notify Admins
                Controller->>Frontend: 201 { leaveRequest }
            end
        end
    end

    Note over Admin,Frontend: Admin processes the request
    Admin->>Frontend: Approve/Reject
    Frontend->>Auth: PATCH /api/leave/:requestId/process { status, rejectionReason? }
    Auth->>Controller: processLeaveRequest()
    Controller->>Leave: findById(requestId)
    alt Not found or already processed
        Controller->>Frontend: 404/400
    else Pending
        alt status == approved
            Controller->>TimeSlot: updateMany(block doctor slots between dates)
            par Assign coverage
                Controller->>Shift: load RD shifts per day
                loop Each leave date
                    Controller->>TimeSlot: create coverer slots mirroring RD shift
                end
            and Notify coverers
                Controller->>Notification: notify coverers assigned/requested
            end
        else status == rejected
            Controller->>Leave: set rejectionReason (if any)
        end
        Controller->>Leave: save()
        Controller->>Notification: notify staff result
        Controller->>Frontend: 200 { leaveRequest }
    end
```

### Overtime Request → Approval

## 
Sequence Diagram: Xin tăng ca (Overtime) sau giờ làm.
-	Mục tiêu: Bác sĩ đề xuất tăng ca thêm giờ sau ca hiện tại để nhận thêm bệnh nhân, chờ Admin duyệt.
-	Các bước:
•	Bác sĩ chọn ca, ngày và số giờ muốn tăng ca, nêu lý do; hệ thống tạo yêu cầu và thông báo.
•	Admin duyệt/Từ chối: Khi Duyệt, hệ thống sinh các slot bổ sung ngay sau giờ kết thúc ca trong giới hạn số giờ tăng ca; gửi thông báo kết quả.
-	Trường hợp lỗi: Thiếu trường bắt buộc → 400; Không tìm thấy yêu cầu → 404; Không có quyền (không phải Admin) → 403.

```mermaid
sequenceDiagram
    participant Doctor as Doctor
    participant Admin as Admin
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as Overtime Controller
    participant OT as Overtime Model
    participant Shift as Shift Model
    participant TimeSlot as TimeSlot Model
    participant Notification as Notification Model

    Doctor->>Frontend: Request overtime (shiftId, date, hours, reason)
    Frontend->>Auth: POST /api/overtime/create
    Auth->>Controller: createOvertime()
    Controller->>OT: new Overtime({ doctorId, shiftId, date, hours })
    OT-->>Controller: saved
    Controller->>Notification: notify doctor (submitted)
    Controller->>Frontend: 201 { overtime }

    Admin->>Frontend: Approve/Reject overtime
    Frontend->>Auth: PATCH /api/overtime/:id/status { status, adminComment? }
    Auth->>Controller: updateOvertimeStatus()
    Controller->>OT: findById(id)
    alt Not found
        Controller->>Frontend: 404
    else Found
        alt status == approved
            Controller->>Shift: findById(ot.shiftId)
            loop Generate slots after shift end within approved hours
                Controller->>TimeSlot: create({ start=endTime.., duration=slotDuration, isAvailable:true })
            end
        else status == rejected
            Note over Controller: No slot changes
        end
        Controller->>Notification: notify doctor result
        Controller->>Frontend: 200 { overtime }
    end
```

### Shift Swap → Partner Respond → Admin Approval

## 
Sequence Diagram: Đổi ca làm (Shift Swap) với đồng nghiệp.
-	Mục tiêu: Bác sĩ đề xuất đổi ca (trao đổi hai chiều hoặc nhờ đồng nghiệp trực giúp), đồng nghiệp phản hồi, Admin phê duyệt.
-	Các bước:
•	Bác sĩ A tạo yêu cầu đổi ca: chọn ca gốc, đồng nghiệp B, kiểu đổi (trade/cover), chọn ngày hoặc khoảng ngày; hệ thống kiểm tra quyền sở hữu ca, tương thích chuyên khoa/khoa, xung đột thời gian.
•	Đồng nghiệp B phản hồi Chấp nhận/Từ chối. Khi B đã chấp nhận, Admin có thể Duyệt: hệ thống đảm bảo có slot cho ngày liên quan, chuyển quyền các slot ca gốc sang B; với trade, nếu ca yêu cầu của B có đúng ngày trong tuần thì chuyển slot ngược lại cho A; cập nhật phân công nếu trùng nghỉ đã duyệt.
-	Trường hợp lỗi: Dữ liệu/điều kiện không hợp lệ → 400; Chưa có phản hồi của đối tác nhưng yêu cầu duyệt → 400; Không có quyền/không tìm thấy yêu cầu → 403/404.

```mermaid
sequenceDiagram
    participant Requester as Doctor A (Requester)
    participant Partner as Doctor B (Swap With)
    participant Admin as Admin
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as ShiftSwap Controller
    participant Swap as ShiftSwap Model
    participant UserModel as User Model
    participant DoctorModel as Doctor Model
    participant Shift as Shift Model
    participant TimeSlot as TimeSlot Model
    participant Leave as LeaveRequest Model
    participant Notification as Notification Model

    Requester->>Frontend: Create swap (originalShiftId, requestedShiftId?, swapWithId, swapDate or range, swapType)
    Frontend->>Auth: POST /api/shift-swap/create
    Auth->>Controller: createShiftSwap()
    Controller->>UserModel: findById(requester)
    Controller->>Shift: findById(originalShiftId)
    alt swapType == trade
        Controller->>Shift: findById(requestedShiftId)
    end
    Controller->>DoctorModel: load profiles
    Controller->>DoctorModel: validate department and specialization match
    Controller->>Shift: validate day/time overlap constraints
    alt Validation fails
        Controller->>Frontend: 400 with reason
    else OK
        Controller->>Swap: new ShiftSwap({...})
        Swap-->>Controller: saved
        Controller->>Notification: notify Partner (swap request)
        Controller->>Frontend: 201 { swap }
    end

    Partner->>Frontend: Respond decision (accepted/declined)
    Frontend->>Auth: POST /api/shift-swap/:id/respond { decision }
    Auth->>Controller: partnerRespondSwap()
    Controller->>Swap: update partnerDecision
    Controller->>Notification: notify Requester (decision)
    Controller->>Frontend: 200 { swap }

    Admin->>Frontend: Approve/Reject swap
    Frontend->>Auth: PATCH /api/shift-swap/:id/status { status, adminComment? }
    Auth->>Controller: updateShiftSwapStatus()
    Controller->>Swap: findById(id)
    alt Approve without partner accept
        Controller->>Frontend: 400 partner not accepted
    else Approve
        loop For each affected date
            Controller->>TimeSlot: ensure slots exist for date (if missing)
            Controller->>TimeSlot: move originalShift slots to Partner (doctorId = swapWithId)
            alt swapType == trade and requested shift includes weekday
                Controller->>TimeSlot: move requestedShift slots to Requester
            end
            opt If overlaps approved leave
                Controller->>Leave: add coveringStaff assignment for that date
            end
        end
        Controller->>Notification: notify both doctors
        Controller->>Frontend: 200 { swap }
    end
```

## 
Sequence Diagram: Tạo Hồ sơ bệnh án đi kèm với Đơn thuốc và Số liệu sức khỏe.
-	Mục tiêu: Bác sĩ tạo Hồ sơ bệnh án cho lịch hẹn đã hoàn thành.
-	Các bước:
•	Bác sĩ đi tới trang “Medical Record” để xem những cuộc hẹn đã hoàn thành và sau đó bấm vào nút “Create Record”.
•	Bác sĩ điền các thông tin cần thiết cho hồ sơ bệnh án của bệnh nhân, với những mục không cần thiết bác sĩ có thể chọn nút “Skip” để lược bỏ phần đó khỏi hồ sơ bệnh án.
•	Với mỗi hồ sơ bệnh án có thể đính kèm từ 1 đến nhiều đơn thuốc, bác sĩ có thể kê thêm đơn phụ thuộc vào tình hình của bệnh nhân. Với Số liệu sức khỏe bác sĩ có thể phụ thuộc vào các số liệu khám của bệnh nhân mà điền vào.
•	Sau khi hoàn thành bước điền, bác sĩ bấm vào nút “Create Medical Record” để tạo Hồ sơ bệnh án hoàn chỉnh cho bệnh nhân.

## Medical Record - Create Flow
```mermaid
sequenceDiagram
    participant Doctor as Doctor
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as MedicalRecord Controller
    participant Appointment as Appointment Model
    participant MedRecord as MedicalRecord Model
    participant Notification as Notification Model

    Doctor->>Frontend: Open appointment details and click "Create Medical Record"
    Frontend->>Auth: POST /api/medical-record/create { appointmentId, ...fields }
    Auth->>Controller: createMedicalRecord()

    Controller->>Controller: validationResult() (express-validator)
    alt Validation fails
        Controller->>Frontend: 400 Validation failed
    else Valid
        Controller->>Appointment: findById(appointmentId) + populate(userId, doctorId)
        alt Appointment not found
            Controller->>Frontend: 404 Appointment not found
        else Found
            Controller->>Controller: Check doctor ownership (req.userId == appointment.doctorId)
            alt Not assigned doctor
                Controller->>Frontend: 403 Only assigned doctor can create record
            else OK
                Controller->>MedRecord: findOne({ appointmentId })
                alt Record exists
                    Controller->>Frontend: 400 Medical record already exists for this appointment
                else Not exists
                    Controller->>MedRecord: new MedicalRecord({... set patientId, doctorId, visitDate, ...})
                    MedRecord-->>Controller: saved
                    Controller->>Appointment: set medicalRecordId = MedRecord._id
                    Controller->>Appointment: save()
                    Controller->>Notification: create for patient
                    Notification-->>Controller: saved
                    Controller->>Frontend: 201 { medicalRecord (populated with prescriptions, healthMetrics) }
                end
            end
        end
    end
```

## Prescription - Add to Record Flow
```mermaid
sequenceDiagram
    participant Doctor as Doctor
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as Prescription Controller
    participant UserModel as User Model
    participant Appointment as Appointment Model
    participant MedRecord as MedicalRecord Model
    participant Prescription as Prescription Model
    participant Notification as Notification Model

    Doctor->>Frontend: Open prescription form from appointment or record
    Frontend->>Auth: POST /api/prescription/create { patientId, appointmentId?, medications, ... }
    Auth->>Controller: createPrescription()

    Controller->>Controller: Ensure req.user.role == 'Doctor'
    alt Not doctor
        Controller->>Frontend: 403 Only doctors can create prescriptions
    else OK
        Controller->>UserModel: findById(patientId)
        alt Patient not found
            Controller->>Frontend: 404 Patient not found
        else Patient exists
        alt Has appointmentId
            Controller->>Appointment: findById(appointmentId)
            alt Appointment not found or mismatch
                Controller->>Frontend: 404/403 Invalid appointment
            else Valid
                Controller->>Prescription: new Prescription({... doctorId=req.user._id })
                Prescription-->>Controller: saved
                Controller->>MedRecord: findOne({ appointmentId })
                alt Record exists
                    Controller->>MedRecord: push prescription._id into prescriptionIds
                    Controller->>MedRecord: save()
                else No record yet
                    Controller->>Controller: Prescription is saved, can be linked to the record later
                end
                Controller->>Notification: notify patient
                Notification-->>Controller: saved
                Controller->>Frontend: 201 { data: prescription }
            end
        else No appointmentId
            Controller->>Prescription: new Prescription(...)
            Prescription-->>Controller: saved
            Controller->>Frontend: 201 { data: prescription }
        end
        end
    end
```

## Health Metrics - Record and Link Flow
```mermaid
sequenceDiagram
    participant User as Patient/Doctor
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as HealthMetrics Controller
    participant Metrics as HealthMetrics Model
    participant UserModel as User Model
    participant MedRecord as MedicalRecord Model

    User->>Frontend: Enter metrics (BP, HR, Temp, Weight, ...)
    Frontend->>Auth: POST /api/health-metrics/create { userId/patientId, ... , appointmentId? | medicalRecordId? }
    Auth->>Controller: createHealthMetrics()

    Controller->>Controller: Check access (self or Doctor/Admin)
    alt Access denied
        Controller->>Frontend: 403 Access denied
    else Allowed
        Controller->>Controller: Resolve targetUserId (userId || patientId || req.user._id)
        Controller->>UserModel: findById(targetUserId)
        alt Patient not found
            Controller->>Frontend: 404 Patient not found
        else Found
            Controller->>Metrics: new HealthMetrics(standardized numeric fields)
            Metrics-->>Controller: saved
            alt appointmentId or medicalRecordId provided
                Controller->>MedRecord: find by medicalRecordId OR by appointmentId
                alt Found
                    Controller->>MedRecord: push metrics._id into healthMetricsIds
                    Controller->>MedRecord: save()
                else Not found
                    Controller->>Controller: Metrics are saved, can be linked to the record later
                end
            else No linking info
                Controller->>Controller: Save metrics independently for the patient
            end
            Controller->>Frontend: 201 { data: healthMetrics }
        end
    end
```

##
Sequence Diagram: Nhắn tin.
-	Mục tiêu: Người dùng gửi và nhận tin nhắn trong phòng chat (theo lịch hẹn hoặc chat trực tiếp).
-	Các bước:
•	Mở giao diện chat.
•	Nếu chưa có phòng chat, hệ thống tạo phòng (theo lịch hẹn hoặc chat trực tiếp giữa hai người).
•	Gõ nội dung và bấm Gửi; người nhận sẽ thấy tin nhắn ngay trên màn hình.
•	Khi người nhận mở chat, tin nhắn sẽ được đánh dấu là đã đọc và số tin chưa đọc trở về 0.

## Chat Message Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as React Frontend
    participant Socket as Socket.io Server
    participant Auth as JWT Auth Middleware
    participant Controller as Chat Controller
    participant ChatRoom as ChatRoom Model
    participant Message as Message Model
    participant Receiver as Receiver Frontend

    Note over User,Frontend: Open chat screen and establish realtime connection
    Frontend->>Socket: connect(token)
    Socket->>Socket: Verify token (authenticateSocket)
    Socket->>Frontend: connection established

    alt First time chatting between users?
        Frontend->>Auth: POST /api/chat/create-direct-room (or /create-room)
        Auth->>Controller: createDirectChatRoom/createChatRoom
        Controller->>ChatRoom: new ChatRoom(...)
        ChatRoom-->>Controller: saved
        Controller->>Frontend: chatRoomId
    else Room already exists
        Frontend->>Frontend: Use existing chatRoomId
    end

    Frontend->>Socket: join-chat-room { chatRoomId }
    Socket->>Socket: Authorize & join room (canUserAccess)

    User->>Frontend: Enter message and click Send
    Frontend->>Socket: send-message { chatRoomId, content, messageType }
    Socket->>ChatRoom: findById + access check
    alt Unauthorized access
        Socket->>Frontend: error 403 Unauthorized
    else Authorized
        Socket->>Message: new Message(...)
        Message-->>Socket: saved
        Socket->>ChatRoom: update lastMessageAt + unread counters
        Socket-->>Frontend: new-message { message, chatRoomId }
        Socket-->>Receiver: new-message { message, chatRoomId }
    end

    opt Recipient opens the chat room
        Receiver->>Socket: mark-messages-read { chatRoomId }
        Socket->>Message: updateMany isRead = true
        Socket->>ChatRoom: reset unread counters
        Socket-->>Frontend: messages-read (notify others)
    end

    opt Fallback (no realtime)
        Frontend->>Auth: POST /api/chat/send-message
        Auth->>Controller: sendMessage()
        Controller->>Message: save()
        Controller-->>Frontend: 200 { message }
    end
```

## Sign In (Login) Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as React Frontend
    participant Validation as Validation Middleware
    participant Controller as User Controller
    participant Database as MongoDB
    participant BCrypt as BCrypt
    participant JWT as JWT Service
    participant Redux as Redux Store

    User->>Frontend: Submit email & password
    Frontend->>Validation: POST /api/user/login
    Validation->>Validation: Validate input
    alt Validation fails
        Validation->>Frontend: 400 Validation error
        Frontend->>User: Show error
    else Validation passes
        Validation->>Controller: login()
        Controller->>Database: Find user by email (+password)
        alt User not found
            Controller->>Frontend: 400 Incorrect credentials
        else User found
            Controller->>BCrypt: Compare password
            alt Password mismatch
                Controller->>Frontend: 400 Incorrect credentials
            else Password matches
                Controller->>JWT: Sign token (userId, role, name, email)
                JWT->>Controller: token
                Controller->>Frontend: 201 success + token
                Frontend->>Frontend: Save token (localStorage)
                Frontend->>Redux: setUserInfo(userId)
                Frontend->>Controller: GET /api/user/getuser/{userId}
                Controller->>Database: Fetch profile
                Database->>Controller: User profile
                Controller->>Frontend: Profile data
                Frontend->>Redux: Update store
                
                alt Role is Admin
                    Frontend->>Frontend: Navigate to /admin/dashboard
                else Role is Patient
                    Frontend->>Frontend: Navigate to /patient/dashboard
                else Role is Doctor
                    Frontend->>Frontend: Navigate to /doctor/dashboard
                end
            end
        end
    end
```

##
Sequence Diagram: Đặt lịch hẹn khám bệnh.
-	Mục tiêu: Cho phép bệnh nhân đặt lịch hẹn với bác sĩ và tạo bản ghi thanh toán, thông báo liên quan.
-	Các bước:
•	Bệnh nhân di chuyển tới trang tìm bác sĩ và dùng thanh tìm kiếm hoặc bộ lọc (chuyên khoa, kinh nghiệm, phí, thời gian làm việc) để tìm người phù hợp sau đó nhấn nút “Book Appointment” ở hồ sơ bác sĩ bạn muốn đặt.
•	Bệnh nhân sau đó chọn ngày, giờ, và lý do khám và đi tới bước thanh toán.
•	Bệnh nhân điền chi tiết thẻ ngân hàng để tiến hành thanh toán.
•	Khi thanh toán thành công, hệ thống tạo lịch hẹn và gửi thông báo xác nhận. Bệnh nhân sẽ nhận được thông báo trong hệ thống. Bác sĩ cũng nhận thông báo về lịch hẹn của bệnh nhân. 
•	Sau khi đặt lịch bệnh nhân có thể xem chi tiết ở trang “My Appointments”.

## Book Appointment Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as React Frontend
    participant Auth as JWT Auth Middleware
    participant Controller as Appointment Controller
    participant DoctorModel as Doctor Model
    participant UserModel as User Model
    participant AppointmentModel as Appointment Model
    participant PaymentModel as Payment Model
    participant NotificationModel as Notification Model

    User->>Frontend: Choose doctor, date/time (+symptoms)
    Frontend->>Auth: POST /api/appointment/bookappointment<br/>Authorization: Bearer <token><br/>Body: { doctorId, date, time, isRecurring?, recurringPattern?, paymentMethod?, consultationFee? }
    Auth->>Auth: Verify JWT
    Auth->>Auth: Set req.locals = userId
    Auth->>Controller: bookappointment()

    Controller->>Controller: Validate doctorId, date, time
    alt Missing required fields
        Controller->>Frontend: 400 Doctor ID, date, and time are required
    else Valid
        Controller->>DoctorModel: findOne({ userId: doctorId })
        alt Doctor not found
            Controller->>Frontend: 404 Doctor not found
        else Doctor found
            Controller->>UserModel: findById(req.locals)
            Controller->>Controller: Resolve defaults (type, priority, duration, fee)

            alt isRecurring with endDate or occurrences
                loop For each occurrence (Weekly/Biweekly/Monthly)
                    Controller->>AppointmentModel: new Appointment(..., paymentStatus: "Paid")
                    Controller->>PaymentModel: new Payment(..., status: "Succeeded")
                    Controller->>NotificationModel: Notify patient
                    Controller->>NotificationModel: Notify doctor
                end
            else Single appointment
                Controller->>AppointmentModel: new Appointment(..., paymentStatus: "Paid")
                Controller->>PaymentModel: new Payment(..., status: "Succeeded")
                Controller->>NotificationModel: Notify patient and doctor
            end

            Controller->>AppointmentModel: save()
            Controller->>PaymentModel: save()
            Controller->>NotificationModel: save()
            Controller->>Frontend: 201 { appointments[], payments[], totalAmount }
        end
    end
```