const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');
const jwt = require('jsonwebtoken');

// Test database setup
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/doctor_appointment_test';

describe('Appointment API', () => {
  let userToken;
  let doctorToken;
  let patientId;
  let doctorId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test users
    const patient = new User({
      firstname: 'Test',
      lastname: 'Patient',
      email: 'patient@test.com',
      password: 'TestPassword123!',
      role: 'Patient'
    });
    await patient.save();
    patientId = patient._id;

    const doctor = new User({
      firstname: 'Test',
      lastname: 'Doctor',
      email: 'doctor@test.com',
      password: 'TestPassword123!',
      role: 'Doctor'
    });
    await doctor.save();
    doctorId = doctor._id;

    // Generate tokens
    userToken = jwt.sign(
      { userId: patientId, role: 'Patient' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    doctorToken = jwt.sign(
      { userId: doctorId, role: 'Doctor' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean appointments before each test
    await Appointment.deleteMany({});
  });

  describe('POST /api/appointment/bookappointment', () => {
    const validAppointmentData = {
      doctorId: null, // Will be set in test
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      time: '10:00',
      age: 30,
      gender: 'male',
      number: '+1234567890',
      bloodGroup: 'O+',
      familyDiseases: 'None'
    };

    test('should book appointment successfully with valid data', async () => {
      const appointmentData = {
        ...validAppointmentData,
        doctorId: doctorId
      };

      const response = await request(app)
        .post('/api/appointment/bookappointment')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appointmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Appointment booked successfully');
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/appointment/bookappointment')
        .send(validAppointmentData);

      expect(response.status).toBe(401);
    });

    test('should fail with invalid doctor ID', async () => {
      const appointmentData = {
        ...validAppointmentData,
        doctorId: new mongoose.Types.ObjectId()
      };

      const response = await request(app)
        .post('/api/appointment/bookappointment')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appointmentData);

      expect(response.status).toBe(400);
    });

    test('should fail with past date', async () => {
      const appointmentData = {
        ...validAppointmentData,
        doctorId: doctorId,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      const response = await request(app)
        .post('/api/appointment/bookappointment')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appointmentData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/appointment/getappointments', () => {
    test('should get user appointments', async () => {
      // Create test appointment
      const appointment = new Appointment({
        userId: patientId,
        doctorId: doctorId,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        time: '10:00',
        age: 30,
        gender: 'male',
        number: '+1234567890'
      });
      await appointment.save();

      const response = await request(app)
        .get('/api/appointment/getappointments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });
});