# Doctor Appointment System API Documentation

## Overview

This comprehensive API documentation covers all endpoints for the Doctor Appointment System - a full-stack healthcare management platform built with Node.js, Express.js, and MongoDB. The API provides complete functionality for appointment management, telemedicine, payment processing, medical records, and real-time communication.

**Base URL:** `http://localhost:5015/api`  
**Production URL:** `https://your-domain.com/api`

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-endpoints)
3. [Doctor Management](#doctor-endpoints)
4. [Appointment Management](#appointment-endpoints)
5. [Medical Records](#medical-records-endpoints)
6. [Payment Processing](#payment-endpoints)
7. [Video Consultations](#video-consultation-endpoints)
8. [Chat System](#chat-endpoints)
9. [Notifications](#notification-endpoints)
10. [Waitlist Management](#waitlist-endpoints)
11. [Shift & Leave Management](#shift-leave-endpoints)
12. [Admin Functions](#admin-endpoints)
13. [Error Handling](#error-responses)
14. [Rate Limiting](#rate-limiting)
15. [Security](#security-features)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header for protected endpoints:

```http
Authorization: Bearer <your_jwt_token>
```

### Token Structure
```json
{
  "userId": "64f123abc456def789",
  "email": "user@example.com",
  "role": "Patient|Doctor|Admin",
  "iat": 1693123456,
  "exp": 1693123456
}
```

## User Endpoints

### Register User
- **POST** `/user/register`
- **Description:** Register a new user (Patient, Doctor, or Admin)
- **Access:** Public
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "Patient",
  "mobile": "+1234567890",
  "age": 30,
  "gender": "male",
  "address": "123 Main St, City, Country"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "64f123abc456def789",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "Patient"
  }
}
```

### Login User
- **POST** `/user/login`
- **Description:** Authenticate user and receive JWT token
- **Access:** Public
- **Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "Patient"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f123abc456def789",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "Patient",
    "isApproved": true
  }
}
```

### Get User Profile
- **GET** `/user/getuser/:id`
- **Description:** Get user profile by ID
- **Access:** Protected (own profile or admin)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "user": {
    "id": "64f123abc456def789",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "Patient",
    "age": 30,
    "gender": "male",
    "mobile": "+1234567890",
    "address": "123 Main St, City, Country",
    "profilePicture": "https://example.com/profile.jpg",
    "isActive": true,
    "lastLogin": "2024-08-09T10:30:00.000Z",
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
}
```

### Update Profile
- **PUT** `/user/updateprofile`
- **Description:** Update user profile information
- **Access:** Protected (own profile)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "age": 31,
  "gender": "male",
  "mobile": "+1234567890",
  "address": "456 New St, City, Country",
  "profilePicture": "https://example.com/new-profile.jpg",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+1234567891"
  }
}
```

### Change Password
- **PUT** `/user/changepassword`
- **Description:** Change user password
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### Forgot Password
- **POST** `/user/forgotpassword`
- **Description:** Send password reset email
- **Access:** Public
- **Body:**
```json
{
  "email": "john.doe@example.com"
}
```

### Reset Password
- **POST** `/user/resetpassword/:id/:token`
- **Description:** Reset password using reset token
- **Access:** Public
- **Body:**
```json
{
  "password": "NewPassword123!"
}
```

### Get All Users (Admin)
- **GET** `/user/getAllUsers`
- **Description:** Get all users with pagination and filtering
- **Access:** Admin only
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 10) - Items per page
  - `role` (optional) - Filter by role
  - `search` (optional) - Search by name or email
- **Response:**
```json
{
  "success": true,
  "users": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

## Appointment Endpoints

### Book Appointment
- **POST** `/appointment/bookappointment`
- **Description:** Book a new appointment
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "doctorId": "doctor_id",
  "date": "2024-01-15",
  "time": "10:00",
  "age": 30,
  "gender": "male",
  "number": "+1234567890",
  "bloodGroup": "O+",
  "familyDiseases": "None"
}
```

### Get User Appointments
- **GET** `/appointment/getappointments`
- **Description:** Get all appointments for the authenticated user
- **Headers:** `Authorization: Bearer <token>`

### Get Doctor Appointments
- **GET** `/appointment/getdoctorappointments`
- **Description:** Get all appointments for a doctor
- **Headers:** `Authorization: Bearer <token>`

### Update Appointment Status
- **PUT** `/appointment/updatestatus/:id`
- **Description:** Update appointment status (Doctor/Admin only)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "Confirmed"
}
```

### Get Doctor Dashboard Statistics
- **GET** `/appointment/doctor-stats`
- **Description:** Get comprehensive statistics for a doctor's dashboard
- **Headers:** `Authorization: Bearer <token>` (doctor access only)
- **Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalAppointments": 150,
      "todayAppointments": 8,
      "pendingAppointments": 12,
      "completedAppointments": 136,
      "canceledAppointments": 2,
      "monthlyAppointments": 45,
      "totalPatients": 85
    },
    "monthlyTrend": [
      { "month": "Jan", "count": 20 },
      { "month": "Feb", "count": 25 },
      { "month": "Mar", "count": 30 },
      { "month": "Apr", "count": 22 },
      { "month": "May", "count": 28 },
      { "month": "Jun", "count": 45 }
    ],
## Medical Records Endpoints

### Create Medical Record
- **POST** `/medical-record/create`
- **Description:** Create a new medical record (Doctor only)
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "appointmentId": "64f123abc456def789",
  "chiefComplaint": "Patient reports chest pain and shortness of breath",
  "historyOfPresentIllness": "Symptoms started 3 days ago...",
  "vitalSigns": {
    "bloodPressure": {
      "systolic": 140,
      "diastolic": 90
    },
    "heartRate": 85,
    "temperature": 98.6,
    "respiratoryRate": 16,
    "oxygenSaturation": 98,
    "weight": 70.5,
    "height": 175,
    "bmi": 23.0
  },
  "physicalExamination": {
    "general": "Patient appears alert and oriented",
    "cardiovascular": "Regular rhythm, no murmurs",
    "respiratory": "Clear breath sounds bilaterally",
    "other": "No acute distress"
  },
  "assessment": "Possible hypertension, rule out cardiac causes",
  "diagnosis": [
    {
      "code": "I10",
      "description": "Essential hypertension",
      "type": "primary"
    }
  ],
  "treatment": "Lifestyle modifications and antihypertensive medication",
  "prescriptions": [
    {
      "medication": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take with food"
    }
  ],
  "followUp": {
    "required": true,
    "timeframe": "2 weeks",
    "instructions": "Monitor blood pressure daily"
  }
}
```

### Get Medical Record
- **GET** `/medical-record/:recordId`
- **Description:** Get specific medical record
- **Access:** Protected (Patient owns record, Doctor created record, or Admin)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "medicalRecord": {
    "id": "64f123abc456def789",
    "appointmentId": "64f123abc456def788",
    "patientId": "64f123abc456def787",
    "doctorId": "64f123abc456def786",
    "visitDate": "2024-08-09T10:00:00.000Z",
    "chiefComplaint": "Chest pain and shortness of breath",
    "vitalSigns": {...},
    "diagnosis": [...],
    "prescriptions": [...],
    "attachments": [
      {
        "filename": "ecg_report.pdf",
        "url": "https://secure-storage.com/ecg_report.pdf",
        "type": "lab_result",
        "uploadedAt": "2024-08-09T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-08-09T10:00:00.000Z",
    "updatedAt": "2024-08-09T11:00:00.000Z"
  }
}
```

### Get Patient Medical Records
- **GET** `/medical-record/patient/:patientId`
- **Description:** Get all medical records for a patient
- **Access:** Protected (Patient owns records, treating doctors, or Admin)
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 10) - Items per page
  - `startDate` (optional) - Filter from date
  - `endDate` (optional) - Filter to date
  - `doctorId` (optional) - Filter by doctor
- **Response:**
```json
{
  "success": true,
  "medicalRecords": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Update Medical Record
- **PUT** `/medical-record/:recordId`
- **Description:** Update medical record (Doctor who created it only)
- **Access:** Protected (Doctor role, own records)
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Same as create, with updated fields

### Add Voice Note
- **POST** `/medical-record/:recordId/voice-note`
- **Description:** Add voice note to medical record
- **Access:** Protected (Doctor who created record)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "filename": "consultation_note_20240809.mp3",
  "url": "https://secure-storage.com/voice_note.mp3",
  "duration": 120,
  "transcription": "Patient reports improvement in symptoms..."
}
```

### Add Attachment
- **POST** `/medical-record/:recordId/attachment`
- **Description:** Add file attachment to medical record
- **Access:** Protected (Doctor who created record)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "filename": "lab_results.pdf",
  "url": "https://secure-storage.com/lab_results.pdf",
  "type": "lab_result", // image, document, lab_result, imaging
  "description": "Blood work results"
}
```

### Get Patient Summary
- **GET** `/medical-record/patient/:patientId/summary`
- **Description:** Get comprehensive patient medical summary
- **Access:** Protected (Treating doctors or Admin)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "summary": {
    "patient": {
      "id": "64f123abc456def789",
      "name": "John Doe",
      "age": 35,
      "gender": "male",
      "bloodGroup": "O+"
    },
    "chronicConditions": [
      {
        "condition": "Hypertension",
        "diagnosedDate": "2023-05-15T00:00:00.000Z",
        "status": "active"
      }
    ],
    "allergies": [
      {
        "allergen": "Penicillin",
        "reaction": "Rash",
        "severity": "moderate"
      }
    ],
    "currentMedications": [...],
    "recentVisits": [...],
    "vitalTrends": {
      "bloodPressure": [...],
      "weight": [...]
    }
  }
}
```

## Doctor Endpoints

### Apply for Doctor
- **POST** `/doctor/apply`
- **Description:** Apply to become a verified doctor
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "specialization": "Cardiology",
  "experience": 5,
  "fees": 150,
  "qualification": "MD, MBBS",
  "bio": "Experienced cardiologist with 5 years of practice",
  "licenseNumber": "MD123456",
  "hospitalAffiliation": "City General Hospital",
  "education": [
    {
      "degree": "MBBS",
      "institution": "Medical University",
      "year": "2018"
    }
  ],
  "certifications": [
    {
      "name": "Board Certified Cardiologist",
      "authority": "Medical Board",
      "year": "2020"
    }
  ]
}
```

### Get All Doctors
- **GET** `/doctor/getalldoctors`
- **Description:** Get list of all approved doctors
- **Access:** Public
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 10) - Items per page
  - `specialization` (optional) - Filter by specialization
  - `search` (optional) - Search by name
  - `minFees` (optional) - Minimum consultation fees
  - `maxFees` (optional) - Maximum consultation fees
- **Response:**
```json
{
  "success": true,
  "doctors": [
    {
      "id": "64f123abc456def789",
      "userId": {
        "firstname": "Dr. Jane",
        "lastname": "Smith",
        "email": "jane.smith@hospital.com",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "specialization": "Cardiology",
      "experience": 5,
      "fees": 150,
      "rating": 4.5,
      "totalRatings": 45,
      "bio": "Experienced cardiologist...",
      "isApproved": true,
      "isAvailable": true,
      "nextAvailableSlot": "2024-08-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Get Doctor Profile
- **GET** `/doctor/profile/:doctorId`
- **Description:** Get detailed doctor profile
- **Access:** Public
- **Response:**
```json
{
  "success": true,
  "doctor": {
    "id": "64f123abc456def789",
    "personalInfo": {
      "firstname": "Dr. Jane",
      "lastname": "Smith",
      "email": "jane.smith@hospital.com",
      "mobile": "+1234567890"
    },
    "professionalInfo": {
      "specialization": "Cardiology",
      "experience": 5,
      "fees": 150,
      "licenseNumber": "MD123456",
      "qualification": "MD, MBBS",
      "bio": "Experienced cardiologist..."
    },
    "ratings": {
      "average": 4.5,
      "total": 45,
      "distribution": {
        "5": 30,
        "4": 10,
        "3": 3,
        "2": 1,
        "1": 1
      }
    },
    "availability": {
      "isAvailable": true,
      "nextSlot": "2024-08-10T10:00:00.000Z",
      "workingHours": {
        "monday": { "start": "09:00", "end": "17:00" },
        "tuesday": { "start": "09:00", "end": "17:00" }
      }
    }
  }
}
```

### Update Doctor Profile
- **PUT** `/doctor/updateprofile`
- **Description:** Update doctor profile (Doctor only)
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "specialization": "Cardiology",
  "experience": 6,
  "fees": 175,
  "bio": "Updated bio...",
  "isAvailable": true
}
```

### Get Doctor Applications (Admin)
- **GET** `/doctor/applications`
- **Description:** Get pending doctor applications
- **Access:** Admin only
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `status` (optional) - pending, approved, rejected
- **Response:**
```json
{
  "success": true,
  "applications": [
    {
      "id": "64f123abc456def789",
      "userId": {
        "firstname": "John",
        "lastname": "Doctor",
        "email": "john@example.com"
      },
      "specialization": "Neurology",
      "experience": 3,
      "qualification": "MD",
      "status": "pending",
      "appliedAt": "2024-08-01T10:00:00.000Z"
    }
  ]
}
```

### Approve/Reject Doctor Application (Admin)
- **PUT** `/doctor/application/:applicationId`
- **Description:** Approve or reject doctor application
- **Access:** Admin only
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "approved", // or "rejected"
  "rejectionReason": "Incomplete documentation" // required if rejected
}
```

## Payment Endpoints

### Create Payment Intent
- **POST** `/payment/create-payment-intent`
- **Description:** Create Stripe payment intent for appointment booking
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "appointmentData": {
    "doctorId": "64f123abc456def789",
    "date": "2024-08-15",
    "time": "10:00",
    "symptoms": "Regular checkup",
    "appointmentType": "regular"
  },
  "amount": 150,
  "currency": "USD"
}
```
- **Response:**
```json
{
  "success": true,
  "clientSecret": "pi_1234567890_secret_abcdef",
  "paymentIntentId": "pi_1234567890",
  "amount": 150,
  "currency": "USD"
}
```

### Confirm Payment
- **POST** `/payment/confirm-payment`
- **Description:** Confirm payment and create appointment
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "paymentIntentId": "pi_1234567890"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "appointment": {
    "id": "64f123abc456def789",
    "status": "Confirmed",
    "paymentStatus": "Paid"
  },
  "payment": {
    "id": "64f123abc456def788",
    "amount": 150,
    "receiptUrl": "https://pay.stripe.com/receipts/..."
  }
}
```

### Get Payment History
- **GET** `/payment/payment-history`
- **Description:** Get user's payment history
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 10) - Items per page
- **Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "64f123abc456def789",
      "appointmentId": "64f123abc456def788",
      "amount": 150,
      "currency": "USD",
      "status": "succeeded",
      "paymentDate": "2024-08-09T10:00:00.000Z",
      "receiptUrl": "https://pay.stripe.com/receipts/...",
      "doctor": {
        "name": "Dr. Jane Smith",
        "specialization": "Cardiology"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Get Payment Details
- **GET** `/payment/payment/:paymentId`
- **Description:** Get detailed payment information
- **Access:** Protected (Payment owner or Admin)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "payment": {
    "id": "64f123abc456def789",
    "appointmentId": "64f123abc456def788",
    "patientId": "64f123abc456def787",
    "doctorId": "64f123abc456def786",
    "amount": 150,
    "currency": "USD",
    "paymentMethod": "card",
    "status": "succeeded",
    "stripePaymentIntentId": "pi_1234567890",
    "receiptUrl": "https://pay.stripe.com/receipts/...",
    "platformFee": 15,
    "doctorEarnings": 135,
    "paymentDate": "2024-08-09T10:00:00.000Z"
  }
}
```

### Request Refund
- **POST** `/payment/request-refund`
- **Description:** Request refund for a payment
- **Access:** Protected (Payment owner or Admin)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "paymentId": "64f123abc456def789",
  "refundAmount": 150,
  "reason": "Appointment cancelled by doctor"
}
```

### Get Doctor Earnings
- **GET** `/payment/doctor-earnings`
- **Description:** Get doctor's earnings summary
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `startDate` (optional) - Filter from date
  - `endDate` (optional) - Filter to date
- **Response:**
```json
{
  "success": true,
  "earnings": {
    "totalEarnings": 5250,
    "totalPayments": 40,
    "totalAmount": 6000,
    "totalPlatformFees": 600,
    "averagePerAppointment": 131.25,
    "monthlyBreakdown": [
      {
        "month": "2024-07",
        "earnings": 2100,
        "appointments": 16
      }
    ]
  }
}
```

## Video Consultation Endpoints

### Create Video Consultation
- **POST** `/video-consultation/create`
- **Description:** Create video consultation session for appointment
- **Access:** Protected (Patient or Doctor)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "appointmentId": "64f123abc456def789",
  "duration": 30,
  "platform": "webrtc",
  "recordingEnabled": false
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Video consultation created successfully",
  "consultation": {
    "id": "64f123abc456def788",
    "meetingId": "vc_unique_meeting_id",
    "meetingUrl": "https://yourapp.com/video-consultation/vc_unique_meeting_id",
    "scheduledTime": "2024-08-15T10:00:00.000Z",
    "duration": 30,
    "platform": "webrtc"
  }
}
```

### Join Video Consultation
- **GET** `/video-consultation/join/:meetingId`
- **Description:** Join existing video consultation
- **Access:** Protected (Patient or Doctor in consultation)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "consultation": {
    "id": "64f123abc456def788",
    "meetingId": "vc_unique_meeting_id",
    "meetingUrl": "https://yourapp.com/video-consultation/vc_unique_meeting_id",
    "status": "active",
    "participants": {
      "patient": {
        "id": "64f123abc456def787",
        "name": "John Doe",
        "joinedAt": "2024-08-15T10:00:00.000Z"
      },
      "doctor": {
        "id": "64f123abc456def786",
        "name": "Dr. Jane Smith",
        "joinedAt": null
      }
    }
  }
}
```

### End Video Consultation
- **POST** `/video-consultation/end/:consultationId`
- **Description:** End video consultation session
- **Access:** Protected (Participants in consultation)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "message": "Successfully left video consultation",
  "consultation": {
    "id": "64f123abc456def788",
    "status": "completed",
    "actualDuration": 25
  }
}
```

### Add Consultation Notes
- **POST** `/video-consultation/:consultationId/notes`
- **Description:** Add medical notes to video consultation (Doctor only)
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "symptoms": "Patient reports improvement in chest pain",
  "diagnosis": "Stable angina",
  "treatment": "Continue current medication",
  "prescriptions": [
    {
      "medication": "Nitroglycerin",
      "dosage": "0.4mg",
      "frequency": "As needed",
      "instructions": "Sublingual for chest pain"
    }
  ],
  "followUpRequired": true,
  "followUpDate": "2024-08-29T10:00:00.000Z"
}
```

### Submit Feedback
- **POST** `/video-consultation/:consultationId/feedback`
- **Description:** Submit feedback for consultation
- **Access:** Protected (Participants in consultation)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "rating": 5,
  "feedback": "Excellent consultation, very professional",
  "technicalRating": 4,
  "overallSatisfaction": "very-satisfied",
  "suggestions": "Could improve audio quality"
}
```

### Get User Consultations
- **GET** `/video-consultation/user`
- **Description:** Get user's video consultation history
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 10) - Items per page
  - `status` (optional) - Filter by status
- **Response:**
```json
{
  "success": true,
  "consultations": [...],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Report Technical Issue
- **POST** `/video-consultation/:consultationId/issue`
- **Description:** Report technical issues during consultation
- **Access:** Protected (Participants in consultation)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "issue": "Audio cutting out frequently",
  "severity": "medium"
}
```

## Chat Endpoints

### Create Chat Room
- **POST** `/chat/create-room`
- **Description:** Create chat room for appointment
- **Access:** Protected (Patient or Doctor)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "appointmentId": "64f123abc456def789"
}
```

### Create Direct Chat Room
- **POST** `/chat/create-direct-room`
- **Description:** Create direct chat room without appointment
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "participantId": "64f123abc456def789",
  "roomName": "Direct consultation"
}
```

### Get Available Users
- **GET** `/chat/available-users`
- **Description:** Get users available for chatting
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "64f123abc456def789",
      "name": "Dr. Jane Smith",
      "role": "Doctor",
      "specialization": "Cardiology",
      "isOnline": true,
      "profilePicture": "https://example.com/profile.jpg"
    }
  ]
}
```

### Get User Chat Rooms
- **GET** `/chat/rooms`
- **Description:** Get user's chat rooms
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "chatRooms": [
    {
      "id": "64f123abc456def789",
      "name": "Consultation with Dr. Smith",
      "participants": [...],
      "lastMessage": {
        "content": "Thank you for the consultation",
        "timestamp": "2024-08-09T10:30:00.000Z",
        "sender": "John Doe"
      },
      "unreadCount": 2,
      "isActive": true
    }
  ]
}
```

### Get Chat Messages
- **GET** `/chat/rooms/:chatRoomId/messages`
- **Description:** Get messages from chat room
- **Access:** Protected (Room participants)
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 50) - Items per page
- **Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "64f123abc456def789",
      "content": "Hello, how are you feeling today?",
      "sender": {
        "id": "64f123abc456def788",
        "name": "Dr. Jane Smith"
      },
      "timestamp": "2024-08-09T10:00:00.000Z",
      "messageType": "text",
      "attachments": []
    }
  ]
}
```

### Send Message
- **POST** `/chat/send-message`
- **Description:** Send message to chat room (primarily for fallback)
- **Access:** Protected (Room participants)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "chatRoomId": "64f123abc456def789",
  "content": "Thank you for your help",
  "messageType": "text"
}
```

### Upload Chat File
- **POST** `/chat/upload-file`
- **Description:** Upload file to chat
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Body:** FormData with file

### Close Chat Room
- **PUT** `/chat/rooms/:chatRoomId/close`
- **Description:** Close chat room
- **Access:** Protected (Room participants)
- **Headers:** `Authorization: Bearer <token>`

## Notification Endpoints

### Get All Notifications
- **GET** `/notification/getallnotifs`
- **Description:** Get user's notifications
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `limit` (default: 20) - Items per page
  - `unread` (optional) - Filter unread notifications
- **Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "64f123abc456def789",
      "content": "Your appointment with Dr. Smith is confirmed",
      "type": "appointment_confirmation",
      "priority": "normal",
      "isRead": false,
      "createdAt": "2024-08-09T10:00:00.000Z",
      "data": {
        "appointmentId": "64f123abc456def788",
        "doctorName": "Dr. Jane Smith"
      }
    }
  ],
  "unreadCount": 5
}
```

### Clear All Notifications
- **DELETE** `/notification/clearallnotifs`
- **Description:** Mark all notifications as read
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`

### Mark Notification as Read
- **PUT** `/notification/:notificationId/read`
- **Description:** Mark specific notification as read
- **Access:** Protected (Notification owner)
- **Headers:** `Authorization: Bearer <token>`

## Waitlist Endpoints

### Join Waitlist
- **POST** `/waitlist/join`
- **Description:** Join waitlist for fully booked appointment slot
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "doctorId": "64f123abc456def789",
  "date": "2024-08-15",
  "time": "10:00",
  "symptoms": "Follow-up consultation",
  "appointmentType": "regular",
  "priority": "normal"
}
```

### Get User Waitlist
- **GET** `/waitlist/user`
- **Description:** Get user's waitlist entries
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "waitlistEntries": [
    {
      "id": "64f123abc456def789",
      "doctor": {
        "name": "Dr. Jane Smith",
        "specialization": "Cardiology"
      },
      "requestedDate": "2024-08-15",
      "requestedTime": "10:00",
      "status": "waiting",
      "position": 3,
      "estimatedWaitTime": "2-3 days",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Get Doctor Waitlist
- **GET** `/waitlist/doctor`
- **Description:** Get doctor's waitlist entries
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "waitlistEntries": [
    {
      "id": "64f123abc456def789",
      "patient": {
        "name": "John Doe",
        "age": 35
      },
      "requestedDate": "2024-08-15",
      "requestedTime": "10:00",
      "symptoms": "Follow-up consultation",
      "priority": "normal",
      "waitingSince": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Convert Waitlist to Appointment
- **POST** `/waitlist/convert/:waitlistId`
- **Description:** Convert waitlist entry to actual appointment
- **Access:** Protected (Patient or Doctor)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "newDate": "2024-08-16",
  "newTime": "11:00"
}
```

### Remove from Waitlist
- **DELETE** `/waitlist/:waitlistId`
- **Description:** Remove entry from waitlist
- **Access:** Protected (Waitlist owner)
- **Headers:** `Authorization: Bearer <token>`

## Shift & Leave Endpoints

### Create Shift
- **POST** `/shift/create`
- **Description:** Create new shift schedule (Doctor only)
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "title": "Morning Shift",
  "startTime": "09:00",
  "endTime": "17:00",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "maxPatientsPerHour": 4,
  "slotDuration": 30
}
```

### Get Doctor Shifts
- **GET** `/shift/doctor/:doctorId?`
- **Description:** Get shifts for doctor
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`

### Submit Leave Request
- **POST** `/leave/request`
- **Description:** Submit leave request (Doctor only)
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "leaveType": "vacation",
  "startDate": "2024-08-20",
  "endDate": "2024-08-25",
  "reason": "Family vacation",
  "isEmergency": false
}
```

### Get Leave Requests
- **GET** `/leave/`
- **Description:** Get leave requests
- **Access:** Protected
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `status` (optional) - pending, approved, rejected
  - `doctorId` (optional) - Filter by doctor (Admin only)

### Process Leave Request
- **PATCH** `/leave/:requestId/process`
- **Description:** Approve/reject leave request (Admin only)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "approved",
  "rejectionReason": "Insufficient coverage" // required if rejected
}
```

## Shift Swap Endpoints

### Create Shift Swap Request (Doctor)
- **POST** `/shift-swap/create`
- **Description:** Request to swap shifts with another doctor
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "originalShiftId": "64f123abc456def789",
  "requestedShiftId": "64f123abc456def780",
  "swapWithId": "64f123abc456def781",
  "reason": "Personal commitment"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f123abc456def782",
    "status": "pending",
    "doctorId": "64f123abc456def781",
    "requestedShift": "64f123abc456def780",
    "originalShift": "64f123abc456def789",
    "reason": "Personal commitment",
    "createdAt": "2024-08-09T10:00:00.000Z"
  }
}
```

### Get My Shift Swap Requests (Doctor)
- **GET** `/shift-swap/my-swaps`
- **Description:** Get all shift swap requests made by the doctor
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def782",
      "status": "pending",
      "doctorId": "64f123abc456def781",
      "requestedShift": "64f123abc456def780",
      "originalShift": "64f123abc456def789",
      "reason": "Personal commitment",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Get All Shift Swap Requests (Admin)
- **GET** `/shift-swap/all`
- **Description:** Get all shift swap requests (Admin)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def782",
      "status": "pending",
      "doctorId": "64f123abc456def781",
      "requestedShift": "64f123abc456def780",
      "originalShift": "64f123abc456def789",
      "reason": "Personal commitment",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Update Shift Swap Status (Admin)
- **PUT** `/shift-swap/admin-update/:id`
- **Description:** Approve or reject a shift swap request (Admin)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "approved", // or "rejected"
  "adminComment": "Shift swap approved"
}
```
- **Response:**
```json
{
  "success": true
}
```

### Get Shift Swap Requests by Doctor IDs (Patient)
- **GET** `/shift-swap/by-doctors?ids=doctorId1,doctorId2,...`
- **Description:** Get shift swap requests involving specific doctors (Patient)
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def782",
      "status": "pending",
      "doctorId": "64f123abc456def781",
      "requestedShift": "64f123abc456def780",
      "originalShift": "64f123abc456def789",
      "reason": "Personal commitment",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

## Overtime Endpoints

### Create Overtime Request (Doctor)
- **POST** `/overtime/create`
- **Description:** Request for overtime hours for a shift
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "shiftId": "64f123abc456def789",
  "date": "2024-08-15",
  "hours": 2,
  "reason": "Extra hours needed for patient care"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f123abc456def790",
    "status": "pending",
    "doctorId": "64f123abc456def789",
    "shiftId": "64f123abc456def788",
    "date": "2024-08-15",
    "hours": 2,
    "reason": "Extra hours needed for patient care",
    "createdAt": "2024-08-09T10:00:00.000Z"
  }
}
```

### Get My Overtime Requests (Doctor)
- **GET** `/overtime/my-overtime`
- **Description:** Get all overtime requests made by the doctor
- **Access:** Protected (Doctor role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def790",
      "status": "pending",
      "doctorId": "64f123abc456def789",
      "shiftId": "64f123abc456def788",
      "date": "2024-08-15",
      "hours": 2,
      "reason": "Extra hours needed for patient care",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Get All Overtime Requests (Admin)
- **GET** `/overtime/all`
- **Description:** Get all overtime requests (Admin)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def790",
      "status": "pending",
      "doctorId": "64f123abc456def789",
      "shiftId": "64f123abc456def788",
      "date": "2024-08-15",
      "hours": 2,
      "reason": "Extra hours needed for patient care",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

### Update Overtime Status (Admin)
- **PUT** `/overtime/admin-update/:id`
- **Description:** Approve or reject an overtime request (Admin)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "status": "approved", // or "rejected"
  "adminComment": "Overtime approved"
}
```
- **Response:**
```json
{
  "success": true
}
```

### Get Overtime Requests by Doctor IDs (Patient)
- **GET** `/overtime/by-doctors?ids=doctorId1,doctorId2,...`
- **Description:** Get overtime requests involving specific doctors (Patient)
- **Access:** Protected (Patient role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f123abc456def790",
      "status": "pending",
      "doctorId": "64f123abc456def789",
      "shiftId": "64f123abc456def788",
      "date": "2024-08-15",
      "hours": 2,
      "reason": "Extra hours needed for patient care",
      "createdAt": "2024-08-09T10:00:00.000Z"
    }
  ]
}
```

## Admin Endpoints

### Get System Analytics
- **GET** `/admin/analytics`
- **Description:** Get comprehensive system analytics
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "success": true,
  "analytics": {
    "users": {
      "total": 1250,
      "patients": 1000,
      "doctors": 45,
      "admins": 5,
      "newThisMonth": 85
    },
    "appointments": {
      "total": 5000,
      "thisMonth": 450,
      "completed": 4200,
      "cancelled": 300,
      "pending": 500
    },
    "revenue": {
      "totalRevenue": 150000,
      "thisMonth": 15000,
      "averagePerAppointment": 125
    },
    "growth": {
      "userGrowth": "12%",
      "appointmentGrowth": "8%",
      "revenueGrowth": "15%"
    }
  }
}
```

### Get All Logs
- **GET** `/logs/`
- **Description:** Get system logs (Admin only)
- **Access:** Protected (Admin role)
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `level` (optional) - log level filter
  - `startDate` (optional) - Filter from date
  - `endDate` (optional) - Filter to date

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing authentication
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT_ERROR` - Resource conflict (e.g., duplicate booking)
- `RATE_LIMIT_ERROR` - Too many requests
- `SERVER_ERROR` - Internal server error

## Status Codes

### Success Codes
- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Request successful, no content to return

### Client Error Codes
- **400 Bad Request** - Invalid request data or validation errors
- **401 Unauthorized** - Authentication required or invalid token
- **403 Forbidden** - Insufficient permissions for requested resource
- **404 Not Found** - Requested resource not found
- **409 Conflict** - Resource conflict (e.g., duplicate appointment)
- **422 Unprocessable Entity** - Valid request format but logical errors
- **429 Too Many Requests** - Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error** - Unexpected server error
- **502 Bad Gateway** - Upstream service error
- **503 Service Unavailable** - Service temporarily unavailable
- **504 Gateway Timeout** - Upstream service timeout

## Rate Limiting

The API implements intelligent rate limiting to prevent abuse and ensure fair usage:

### Rate Limit Rules
- **General API**: 100 requests per 15-minute window per IP address
- **Authentication endpoints**: 5 requests per minute per IP
- **File upload endpoints**: 10 requests per hour per user
- **Real-time endpoints**: 1000 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1693123456
Retry-After: 900
```

### Rate Limit Response
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_ERROR",
  "retryAfter": 900
}
```

## Data Validation

### Input Validation Rules
- **Email**: Valid email format, max 255 characters
- **Password**: Min 8 characters, must include uppercase, lowercase, number, special character
- **Phone**: Valid international format
- **Dates**: ISO 8601 format (YYYY-MM-DD)
- **Times**: 24-hour format (HH:MM)
- **Text fields**: XSS sanitization, length limits enforced

### Validation Response Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "MIN_LENGTH"
    }
  ]
}
```

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Role-based Access Control**: Patient, Doctor, Admin roles with specific permissions
- **Token Refresh**: Automatic token renewal for active sessions
- **Password Security**: bcrypt hashing with configurable salt rounds

### Data Protection
- **Input Sanitization**: All inputs sanitized against XSS and injection attacks
- **MongoDB Injection Prevention**: Parameterized queries and input validation
- **File Upload Security**: File type validation, size limits, virus scanning
- **Encryption**: Sensitive data encrypted at rest and in transit

### Network Security
- **HTTPS Enforcement**: All production traffic over HTTPS
- **CORS Configuration**: Specific origin allowlists for cross-origin requests
- **Security Headers**: Comprehensive security headers via Helmet.js
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

### API Security
- **Rate Limiting**: Multiple layers of rate limiting
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Secure error responses (no sensitive data leakage)
- **Health Checks**: Regular security health monitoring

### Compliance & Privacy
- **HIPAA Considerations**: Healthcare data handling best practices
- **GDPR Compliance**: Data privacy and user rights protection
- **Audit Trails**: Complete activity logging for security audits
- **Data Anonymization**: Personal data anonymization for analytics

## API Testing

### Postman Collection
Import our comprehensive Postman collection for testing:
```bash
# Download collection
curl -o DoctorAppointment.postman_collection.json \
  https://api.yourapp.com/docs/postman-collection

# Import environment
curl -o DoctorAppointment.postman_environment.json \
  https://api.yourapp.com/docs/postman-environment
```

### Testing Environments
- **Development**: `http://localhost:5015/api`
- **Staging**: `https://staging-api.yourapp.com/api`
- **Production**: `https://api.yourapp.com/api`

### Authentication for Testing
```javascript
// Set authorization token in Postman
pm.test("Login successful", function () {
    var jsonData = pm.response.json();
    pm.environment.set("authToken", jsonData.token);
});
```

## Support & Resources

### Documentation Resources
- **API Reference**: Complete endpoint documentation
- **SDKs**: Available for JavaScript, Python, PHP
- **Code Examples**: Sample implementations in multiple languages
- **Tutorials**: Step-by-step integration guides

### Support Channels
- **Email**: api-support@yourapp.com
- **Documentation**: https://docs.yourapp.com
- **GitHub Issues**: https://github.com/Ash564738/DoctorAppointment/issues
- **Community Forum**: https://community.yourapp.com

### API Status
- **Status Page**: https://status.yourapp.com
- **Uptime**: 99.9% SLA
- **Monitoring**: Real-time performance monitoring

---

**Last Updated**: January 2025  
**API Version**: v1.0  
**Documentation Version**: 2.0  
**Maintained By**: Doctor Appointment System Team
