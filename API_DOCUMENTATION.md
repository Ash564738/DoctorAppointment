# Doctor Appointment System API Documentation

## Overview

This API provides endpoints for managing a doctor appointment system with user authentication, appointment booking, and administrative functions.

**Base URL:** `http://localhost:5015/api`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## User Endpoints

### Register User
- **POST** `/user/register`
- **Description:** Register a new user
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "Patient"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

### Login User
- **POST** `/user/login`
- **Description:** Authenticate user and get JWT token
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
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "Patient"
  }
}
```

### Get User Profile
- **GET** `/user/getuser/:id`
- **Description:** Get user profile by ID
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "id": "user_id",
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "role": "Patient",
  "age": 30,
  "gender": "male",
  "mobile": "+1234567890",
  "address": "123 Main St"
}
```

### Update Profile
- **PUT** `/user/updateprofile`
- **Description:** Update user profile
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "age": 30,
  "gender": "male",
  "mobile": "+1234567890",
  "address": "123 Main St"
}
```

### Change Password
- **PUT** `/user/changepassword`
- **Description:** Change user password
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
- **Body:**
```json
{
  "email": "john.doe@example.com"
}
```

### Reset Password
- **POST** `/user/resetpassword/:id/:token`
- **Description:** Reset password using reset token
- **Body:**
```json
{
  "password": "NewPassword123!"
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

## Doctor Endpoints

### Apply for Doctor
- **POST** `/doctor/apply`
- **Description:** Apply to become a doctor
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "specialization": "Cardiology",
  "experience": 5,
  "fees": 100,
  "qualification": "MD",
  "bio": "Experienced cardiologist"
}
```

### Get All Doctors
- **GET** `/doctor/getalldoctors`
- **Description:** Get list of all approved doctors
- **Response:**
```json
[
  {
    "id": "doctor_id",
    "firstname": "Dr. Jane",
    "lastname": "Smith",
    "specialization": "Cardiology",
    "experience": 5,
    "fees": 100,
    "rating": 4.5
  }
]
```

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
  ]
}
```

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Too Many Requests (rate limited)
- **500** - Internal Server Error

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address.

## Data Validation

All input data is validated and sanitized. Required fields and validation rules are enforced as documented in each endpoint.

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Input sanitization
- XSS protection
- CORS configuration
- Rate limiting
- Helmet security headers
