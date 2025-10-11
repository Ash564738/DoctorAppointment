# HealthCare - Complete Healthcare Management Platform

## 🌟 Overview
HealthCare is a comprehensive, full-stack healthcare management and telemedicine platform built with the MERN stack (MongoDB, Express.js, React, Node.js). It provides a complete digital healthcare ecosystem for patients, doctors, and healthcare administrators with advanced features for appointment management, telemedicine consultations, medical records, and integrated payment processing.

## ✨ Key Features

### 🔐 **Authentication & Security**
- JWT-based authentication with role-based access control (Patient, Doctor, Admin)
- Secure password policies, token refresh, and account management
- Advanced security middleware with XSS protection, rate limiting, and CORS
- HIPAA/GDPR compliance with audit trails and data encryption

### 📅 **Smart Appointment Management**
- **Online Booking**: Real-time slot availability with doctor scheduling
- **Walk-In Queue**: Digital queue management for walk-in patients
- **Waitlist System**: Automatic notifications when slots become available
- **Recurring Appointments**: Support for follow-up and regular check-ups
- **Emergency Appointments**: Priority booking for urgent cases
- **Appointment Reminders**: Automated notifications and confirmations

### 👨‍⚕️ **Doctor Management**
- **Doctor Application**: Complete onboarding and verification process
- **Profile Management**: Specializations, experience, and availability
- **Shift Scheduling**: Flexible shift management with break times
- **Leave Management**: Request and approve vacation, sick leave, emergency leave
- **Overtime Tracking**: Monitor and compensate extra working hours
- **Shift Swapping**: Peer-to-peer shift exchange system
- **Earnings Dashboard**: Detailed financial analytics and payout tracking

### 🏥 **Advanced Medical Records**
- **Electronic Health Records (EHR)**: Comprehensive digital patient records
- **Vital Signs Tracking**: Blood pressure, heart rate, temperature, BMI calculation
- **Health Metrics**: Weight, height, blood sugar, oxygen saturation monitoring
- **Prescription Management**: Digital prescription creation and tracking
- **Medical Attachments**: Upload lab results, X-rays, medical images
- **Voice Notes**: Audio consultation notes with transcription
- **Family Medical History**: Comprehensive family health tracking

### 💊 **Prescription & Medication Management**
- **Digital Prescriptions**: Create, manage, and track prescriptions
- **Medication Database**: Comprehensive drug information and interactions
- **Dosage Management**: Precise dosage instructions and duration tracking
- **Refill Requests**: Automated prescription refill system
- **Pharmacy Integration**: Direct prescription delivery to pharmacies

### 💬 **Real-Time Communication**
- **Chat System**: Appointment-based and direct messaging
- **File Sharing**: Secure medical document and image sharing
- **Message History**: Complete communication audit trail
- **Online Status**: Real-time doctor and patient availability
- **Push Notifications**: Instant alerts for messages and updates

### 💳 **Integrated Payment System**
- **Stripe Integration**: Secure payment processing with multiple methods
- **Transparent Pricing**: Upfront consultation fees and platform charges
- **Payment History**: Detailed transaction records and receipts
- **Refund Management**: Automated refund processing for cancelled appointments
- **Doctor Earnings**: Real-time earnings tracking and payout management
- **Invoice Generation**: Automated PDF invoice creation

### 👥 **Family Healthcare Management**
- **Family Profiles**: Manage healthcare for entire family
- **Dependent Care**: Parents can book appointments for children
- **Shared Medical History**: Access to family medical records
- **Insurance Management**: Track and manage family insurance plans

### 📊 **Analytics & Reporting**
- **Patient Dashboard**: Personal health metrics and appointment history
- **Doctor Analytics**: Patient load, earnings, performance metrics
- **Admin Dashboard**: System-wide analytics, user management, revenue tracking
- **Health Reports**: Automated health trend analysis and insights

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.io for live features
- **Payments**: Stripe API integration
- **File Storage**: Multer with cloud storage support
- **Email**: Nodemailer with Gmail integration
- **Security**: Helmet, express-rate-limit, mongo-sanitize

### **Frontend**
- **Framework**: React 18 with functional components
- **State Management**: Redux Toolkit for global state
- **Routing**: React Router v6 with hash linking
- **UI Library**: Material-UI (MUI) + Ant Design components
- **Charts**: Chart.js and Recharts for analytics
- **Calendar**: FullCalendar for appointment scheduling
- **Payments**: Stripe React components
- **Notifications**: React Hot Toast

### **Development & DevOps**
- **Development**: Nodemon, React Scripts
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, Supertest, React Testing Library
- **Logging**: Winston with multiple transports
- **Monitoring**: Morgan for request logging
- **Validation**: Express Validator for input sanitization

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+ recommended)
- **npm** or **yarn** package manager
- **MongoDB** (local installation or MongoDB Atlas cloud)
- **Git** for version control
- **Stripe Account** (for payment processing)

### 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/Ash564738/DoctorAppointment.git
cd DoctorAppointment
```

2. **Backend Setup**
```bash
cd server
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration (MongoDB URI, JWT secret, Stripe keys, etc.)
```

3. **Frontend Setup**
```bash
cd ../client
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your API endpoint
```

### ⚙️ Environment Configuration

**Backend (.env)**
```bash
# Database
MONGO_URI=mongodb://localhost:27017/healthcare
JWT_SECRET=your_super_secret_jwt_key

# Server
PORT=5015
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Frontend (.env)**
```bash
REACT_APP_SERVER_URL=http://localhost:5015
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 🏃‍♂️ Running the Application

1. **Start MongoDB** (if running locally)
```bash
mongod
```

2. **Start Backend Server**
```bash
cd server
npm run dev
```

3. **Start Frontend** (in a new terminal)
```bash
cd client
npm start
```

4. **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5015
- **API Documentation**: http://localhost:5015/api-docs

### 👤 Default Login Credentials
After initial setup, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@healthcare.com` | `Admin@123` |
| **Doctor** | `doctor@healthcare.com` | `Doctor@123` |
| **Patient** | `patient@healthcare.com` | `Patient@123` |

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

## 💻 Usage

### For Patients
1. **Register** or **Login** to your patient account
2. **Browse Doctors** by specialization, location, or ratings
3. **Book Appointments** with real-time slot availability
4. **Join Walk-in Queue** for immediate care
5. **Video Consultations** for remote healthcare
6. **View Medical Records** and prescription history
7. **Manage Family Profiles** for dependents
8. **Track Health Metrics** and generate reports

### For Doctors
1. **Apply** and get **verified** as a healthcare provider
2. **Manage Schedule** with flexible shift planning
3. **Conduct Consultations** via video or in-person
4. **Create Medical Records** with comprehensive patient data
5. **Prescribe Medications** digitally
6. **Chat** with patients for follow-ups
7. **Track Earnings** and financial analytics
8. **Request Leave** and manage shifts

### For Administrators
1. **User Management**: Approve doctors, manage patients
2. **System Analytics**: Monitor platform performance
3. **Financial Oversight**: Track payments and earnings
4. **Branch Management**: Multi-location support
5. **Audit Logs**: Complete system activity tracking

## 🔧 API Endpoints

The HealthCare platform provides comprehensive RESTful APIs:

- **Authentication**: `/api/user/login`, `/api/user/register`
- **Appointments**: `/api/appointment/*` 
- **Medical Records**: `/api/medical-record/*`
- **Payments**: `/api/payment/*`
- **Video Consultations**: `/api/video-consultation/*`
- **Chat System**: `/api/chat/*`
- **Doctor Management**: `/api/doctor/*`
- **Admin Functions**: `/api/admin/*`

📖 **Complete API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests  
cd client
npm test

# Run with coverage
npm run test:coverage
```