# Doctor Appointment System

## Overview

A comprehensive Doctor Appointment System built with the MERN stack (MongoDB, Express.js, React, Node.js). This application provides a complete solution for managing medical appointments with role-based access control, real-time notifications, and secure authentication.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - Secure JWT-based authentication with role-based access
- **Appointment Management** - Book, view, update, and cancel appointments
- **Doctor Management** - Doctor registration, profile management, and availability
- **Admin Dashboard** - Comprehensive admin panel for system management
- **Real-time Notifications** - Socket.io powered real-time updates
- **Responsive Design** - Mobile-first responsive UI

### Security Features
- Password hashing with bcrypt
- Input validation and sanitization
- XSS protection
- CORS configuration
- Rate limiting
- Helmet security headers
- MongoDB injection protection

### Performance Features
- Database query optimization with indexes
- Response caching
- Code splitting and lazy loading
- Image optimization
- Compression middleware

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Winston** - Logging
- **Jest** - Testing framework

### Frontend
- **React** - UI library
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Material-UI** - UI components
- **Axios** - HTTP client
- **Chart.js** - Data visualization

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/doctor-appointment-system.git
cd doctor-appointment-system
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the server directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/doctor_appointment
MONGODB_TEST_URI=mongodb://localhost:27017/doctor_appointment_test

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=5015
NODE_ENV=development

# Client URL
CLIENT_URL=http://localhost:3000

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Logging
LOG_LEVEL=info
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```

Create a `.env` file in the client directory:

```env
REACT_APP_SERVER_DOMAIN=http://localhost:5015
REACT_APP_API_URL=http://localhost:5015/api
```

### 4. Database Setup

Make sure MongoDB is running on your system. The application will automatically create the necessary collections.

### 5. Start the Application

#### Development Mode

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm start
```

#### Production Mode

**Build Frontend:**
```bash
cd client
npm run build
```

**Start Server:**
```bash
cd server
npm start
```

The application will be available at `http://localhost:3000` (development) or `http://localhost:5015` (production).

## 🧪 Testing

### Backend Tests

```bash
cd server
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Frontend Tests

```bash
cd client
npm test
```

## 📁 Project Structure

```
doctor-appointment-system/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── redux/         # State management
│   │   ├── styles/        # CSS files
│   │   ├── middleware/    # Route protection
│   │   └── helper/        # Utility functions
│   └── package.json
├── server/                # Node.js backend
│   ├── controllers/       # Route handlers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── tests/            # Test files
│   ├── db/               # Database connection
│   └── package.json
├── API_DOCUMENTATION.md  # API documentation
└── README.md
```

## 🔐 User Roles

### Patient
- Register and login
- Book appointments
- View appointment history
- Update profile
- Receive notifications

### Doctor
- Apply for doctor status
- Manage appointments
- Update availability
- View patient details
- Manage profile

### Admin
- Approve doctor applications
- Manage all users
- View system analytics
- Manage appointments
- System configuration

## 🌟 Key Features Explained

### Authentication System
- JWT-based authentication
- Role-based access control
- Password reset functionality
- Email verification (optional)

### Appointment System
- Date and time slot booking
- Conflict prevention
- Status tracking (Pending, Confirmed, Completed, Cancelled)
- Automatic notifications

### Real-time Features
- Live appointment updates
- Instant notifications
- Real-time chat (if implemented)

### Security Measures
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Secure headers with Helmet

## 📊 Performance Optimizations

- Database indexing for faster queries
- Response caching with node-cache
- Code splitting and lazy loading
- Image optimization
- Gzip compression
- Minified production builds

## 🚀 Deployment

### Environment Variables

Ensure all environment variables are properly set for production:

- Use strong JWT secrets
- Configure proper CORS origins
- Set up email service for notifications
- Use production MongoDB instance

### Recommended Deployment Platforms

- **Backend:** Heroku, DigitalOcean, AWS EC2
- **Frontend:** Netlify, Vercel, AWS S3 + CloudFront
- **Database:** MongoDB Atlas, AWS DocumentDB

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](server/LICENSE) file for details.

## 🐛 Known Issues

- Socket.io connection may need refresh in development
- Image upload size limited to 10MB
- Email service requires app-specific passwords for Gmail

## 🔮 Future Enhancements

- [ ] Video consultation integration
- [ ] Payment gateway integration
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Appointment reminders via SMS
- [ ] Integration with calendar apps

## 📞 Support

For support, email support@doctorappointment.com or create an issue in the GitHub repository.

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js community
- MongoDB team
- All open-source contributors
