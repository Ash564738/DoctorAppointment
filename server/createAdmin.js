const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/userModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/appointment')
  .then(() => {
    console.log('Connected to MongoDB');
    return createAdminUser();
  })
  .then(() => {
    console.log('Admin user created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'superadmin@test.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Create admin user
    const adminUser = new User({
      firstname: 'Super',
      lastname: 'Admin',
      email: 'superadmin@test.com',
      password: hashedPassword,
      role: 'Admin',
      verified: true,
      isAdmin: true
    });

    await adminUser.save();
    console.log('Admin user created with email: superadmin@test.com');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}
