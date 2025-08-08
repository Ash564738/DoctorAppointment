const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/userModel');

const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/doctor_appointment_test';

describe('User API', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/user/register', () => {
    const validUserData = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@test.com',
      password: 'TestPassword123!',
      role: 'Patient'
    };

    test('should register user successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/user/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User registered successfully');
    });

    test('should fail with invalid email', async () => {
      const userData = {
        ...validUserData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/user/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail with weak password', async () => {
      const userData = {
        ...validUserData,
        password: '123'
      };

      const response = await request(app)
        .post('/api/user/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/user/register')
        .send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/user/register')
        .send(validUserData);

      expect(response.status).toBe(400);
    });

    test('should fail with invalid role', async () => {
      const userData = {
        ...validUserData,
        role: 'InvalidRole'
      };

      const response = await request(app)
        .post('/api/user/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/user/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Patient'
      });
      await user.save();
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Patient'
      };

      const response = await request(app)
        .post('/api/user/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    test('should fail with invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'TestPassword123!',
        role: 'Patient'
      };

      const response = await request(app)
        .post('/api/user/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
        role: 'Patient'
      };

      const response = await request(app)
        .post('/api/user/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail with wrong role', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Doctor'
      };

      const response = await request(app)
        .post('/api/user/login')
        .send(loginData);

      expect(response.status).toBe(404);
    });
  });

  describe('Password Security', () => {
    test('should hash password before saving', async () => {
      const user = new User({
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Patient'
      });

      await user.save();
      
      // Password should be hashed
      expect(user.password).not.toBe('TestPassword123!');
      expect(user.password.length).toBeGreaterThan(50);
    });

    test('should compare passwords correctly', async () => {
      const user = new User({
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Patient'
      });

      await user.save();
      
      const isMatch = await user.comparePassword('TestPassword123!');
      const isNotMatch = await user.comparePassword('WrongPassword');
      
      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });
  });
});
