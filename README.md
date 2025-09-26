# Doctor Appointment System

## Overview
A full-stack healthcare management and doctor appointment system built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Key Features
- **Comprehensive Authentication & Authorization**: JWT-based login, registration, password reset, and role-based access (Patient, Doctor, Admin). Token refresh, secure password policies, and account management.
- **Appointment Management**: Book, reschedule, cancel, and manage appointments. Includes waitlist system, recurring appointments, and real-time slot availability.
- **Doctor Management**: Doctor application, approval workflow, profile management, scheduling, shift/leave management, shift swaps, and analytics. Admin can approve/reject doctors and manage doctor data.
- **Patient Management**: Family member profiles, medical history, medical records (with attachments), and patient summaries. Secure access for patients and treating doctors.
- **Medical Records & Prescriptions**: Create, update, and view detailed medical records, including vital signs, diagnoses, prescriptions, attachments, and follow-up instructions. Prescription management for doctors.
- **Real-Time Chat & Messaging**: Appointment-based and direct chat rooms, file sharing, message history, and notifications. Online status and unread message tracking.
- **Notifications System**: Real-time and persistent notifications for appointments, payments, system alerts, and more. Mark as read, clear all, and filter unread notifications.
- **Payment & Billing**: Stripe integration for appointment payments, payment history, refunds, doctor earnings, and payout breakdowns. Platform fee calculation and receipts.
- **Admin Dashboard & Analytics**: System-wide analytics (users, appointments, revenue, growth), audit logs, user/doctor/branch management, and system configuration.
- **Shift, Leave, and Overtime Management**: Doctor shift scheduling, leave requests, overtime requests, and admin approval workflows. Shift swap requests and management.
- **Security & Compliance**: Input validation, XSS/injection protection, file upload security, HTTPS, CORS, security headers, audit trails, and compliance with HIPAA/GDPR best practices.
- **API Rate Limiting & Monitoring**: Intelligent rate limiting, health checks, request logging, and error handling for robust API security and reliability.

## Tech Stack
- **Backend:** Node.js, Express.js, MongoDB, JWT, Socket.io, Stripe
- **Frontend:** React, Redux Toolkit, React Router, Axios
- **DevOps:** Docker, ESLint, Prettier

## Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MongoDB (local or Atlas)
- Git

### Installation
```bash
git clone https://github.com/Ash564738/DoctorAppointment.git
cd DoctorAppointment

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### Running Locally
Start MongoDB, then:
```bash
# Backend
cd server
npm run dev

# Frontend (in another terminal)
cd ../client
npm start
```

### Default Logins (after running setup scripts)
- Admin: `admin@hospital.com` / `Admin@123`
- Doctor: `doctor@hospital.com` / `Doctor@123`
- Patient: `patient@hospital.com` / `Patient@123`

## Project Structure (Simplified)
```
DoctorAppointment/
├── client/                  # React frontend
│   ├── public/              # Static assets and index.html
│   ├── src/
│   │   ├── assets/          # Images, icons, and static resources
│   │   ├── components/      # Shared React components
│   │   ├── helper/          # Utility/helper functions
│   │   ├── hooks/           # Custom React hooks
│   │   ├── middleware/      # Client-side middleware (e.g., auth, error handling)
│   │   ├── pages/           # Page-level components, organized by role:
│   │   │   ├── Admin/       # Admin dashboards & management (users, doctors, branches, analytics, logs, config)
│   │   │   ├── Doctor/      # Doctor dashboards, appointments, earnings, analytics, records, shifts
│   │   │   ├── Patient/     # Patient dashboards, appointments, records, payments, family profiles
│   │   │   └── Common/      # Shared pages (login, register, notifications, profile, error, home)
│   │   ├── redux/           # Redux Toolkit slices and store
│   │   ├── routes/          # React Router route definitions
│   │   ├── styles/          # CSS/SCSS files
│   │   └── utils/           # Utility functions
│   └── package.json         # Frontend dependencies
│
├── server/                  # Node.js backend
│   ├── controllers/         # Route controllers (appointments, users, doctors, payments, analytics, etc.)
│   ├── db/                  # Database connection and logs
│   ├── middleware/          # Express middleware (auth, validation, security, logging, rate limiting)
│   ├── models/              # Mongoose models (User, Appointment, MedicalRecord, etc.)
│   ├── routes/              # Express route definitions
│   ├── scripts/             # Backend scripts (maintenance, health checks)
│   ├── socket/              # Socket.io real-time server
│   ├── utils/               # Utility functions
│   ├── server.js            # Main server entry point
│   └── package.json         # Backend dependencies
│
├── scripts/                 # Project-level setup and maintenance scripts
├── API_DOCUMENTATION.md     # Full API documentation
├── README.md                # Project documentation
└── ...                      # Other config files (Docker, ESLint, etc.)
```

## Usage
- Visit `http://localhost:3000` for the frontend
- API at `http://localhost:5015`