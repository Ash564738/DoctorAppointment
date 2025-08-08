// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/doctor_appointment_test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  generateValidUser: (overrides = {}) => ({
    firstname: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'Patient',
    ...overrides
  }),
  
  generateValidAppointment: (userId, doctorId, overrides = {}) => ({
    userId,
    doctorId,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    time: '10:00',
    age: 30,
    gender: 'male',
    number: '+1234567890',
    ...overrides
  })
};

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});
