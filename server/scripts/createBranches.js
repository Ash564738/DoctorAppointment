const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Branch = require('../models/branchModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/doctorappointment');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Generate sample branches
const generateSampleBranches = async () => {
  try {
    // Check if branches already exist
    const existingBranches = await Branch.countDocuments();
    if (existingBranches > 0) {
      console.log(`ℹ️  Found ${existingBranches} existing branches in database`);
      console.log('🔄 Clearing existing branches to create fresh sample data...');
      await Branch.deleteMany({});
    }

    console.log('🏥 Generating sample branch data...');

    const sampleBranches = [
      {
        name: 'Central Medical Hospital',
        location: 'Downtown, City Center',
        address: '123 Healthcare Avenue, Medical District, New York, NY 10001',
        manager: 'Dr. Sarah Johnson',
        contact: '+1-555-0123',
        email: 'central@hospital.com',
        operatingHours: '24/7',
        services: ['Emergency Care', 'Surgery', 'ICU', 'Radiology', 'Laboratory'],
        status: 'active',
        capacity: {
          beds: 200,
          rooms: 150,
          staff: 350
        },
        coordinates: {
          latitude: 40.7589,
          longitude: -73.9851
        },
        metadata: {
          totalPatients: 15000,
          totalAppointments: 45000,
          averageRating: 4.5
        }
      },
      {
        name: 'North District Clinic',
        location: 'North District, Suburban Area',
        address: '456 Wellness Street, North District, New York, NY 10002',
        manager: 'Dr. Michael Chen',
        contact: '+1-555-0124',
        email: 'north@hospital.com',
        operatingHours: '8:00 AM - 8:00 PM',
        services: ['General Practice', 'Pediatrics', 'Cardiology', 'Dermatology'],
        status: 'active',
        capacity: {
          beds: 50,
          rooms: 40,
          staff: 80
        },
        coordinates: {
          latitude: 40.8176,
          longitude: -73.9782
        },
        metadata: {
          totalPatients: 8500,
          totalAppointments: 22000,
          averageRating: 4.2
        }
      },
      {
        name: 'Emergency Care Center',
        location: 'Central Plaza, Business District',
        address: '789 Emergency Lane, Central Plaza, New York, NY 10003',
        manager: 'Dr. Emily Rodriguez',
        contact: '+1-555-0125',
        email: 'emergency@hospital.com',
        operatingHours: '24/7',
        services: ['Emergency Medicine', 'Trauma Care', 'Critical Care', 'Ambulance'],
        status: 'active',
        capacity: {
          beds: 30,
          rooms: 25,
          staff: 120
        },
        coordinates: {
          latitude: 40.7505,
          longitude: -73.9934
        },
        metadata: {
          totalPatients: 12000,
          totalAppointments: 18000,
          averageRating: 4.7
        }
      },
      {
        name: 'Pediatric Specialty Center',
        location: 'Family District, Residential Area',
        address: '321 Children\'s Way, Family District, New York, NY 10004',
        manager: 'Dr. David Park',
        contact: '+1-555-0126',
        email: 'pediatric@hospital.com',
        operatingHours: '7:00 AM - 7:00 PM',
        services: ['Pediatrics', 'Neonatal Care', 'Child Psychology', 'Immunizations'],
        status: 'active',
        capacity: {
          beds: 40,
          rooms: 35,
          staff: 60
        },
        coordinates: {
          latitude: 40.7282,
          longitude: -73.9942
        },
        metadata: {
          totalPatients: 6500,
          totalAppointments: 19000,
          averageRating: 4.8
        }
      },
      {
        name: 'West Side Rehabilitation Center',
        location: 'West Side, Healthcare Complex',
        address: '654 Recovery Road, West Side, New York, NY 10005',
        manager: 'Dr. Lisa Thompson',
        contact: '+1-555-0127',
        email: 'rehab@hospital.com',
        operatingHours: '6:00 AM - 9:00 PM',
        services: ['Physical Therapy', 'Occupational Therapy', 'Sports Medicine', 'Pain Management'],
        status: 'maintenance',
        capacity: {
          beds: 25,
          rooms: 30,
          staff: 45
        },
        coordinates: {
          latitude: 40.7061,
          longitude: -74.0087
        },
        metadata: {
          totalPatients: 3200,
          totalAppointments: 8500,
          averageRating: 4.3
        }
      },
      {
        name: 'Senior Care Facility',
        location: 'East Side, Retirement Community',
        address: '987 Golden Years Boulevard, East Side, New York, NY 10006',
        manager: 'Dr. Robert Wilson',
        contact: '+1-555-0128',
        email: 'senior@hospital.com',
        operatingHours: '24/7',
        services: ['Geriatrics', 'Memory Care', 'Long-term Care', 'Palliative Care'],
        status: 'active',
        capacity: {
          beds: 80,
          rooms: 70,
          staff: 110
        },
        coordinates: {
          latitude: 40.7831,
          longitude: -73.9712
        },
        metadata: {
          totalPatients: 4800,
          totalAppointments: 12000,
          averageRating: 4.6
        }
      },
      {
        name: 'Outpatient Surgery Center',
        location: 'Medical Campus, University District',
        address: '147 Surgical Suite Drive, Medical Campus, New York, NY 10007',
        manager: 'Dr. Amanda Foster',
        contact: '+1-555-0129',
        email: 'surgery@hospital.com',
        operatingHours: '6:00 AM - 6:00 PM',
        services: ['Outpatient Surgery', 'Endoscopy', 'Minimally Invasive Surgery', 'Day Surgery'],
        status: 'active',
        capacity: {
          beds: 15,
          rooms: 12,
          staff: 35
        },
        coordinates: {
          latitude: 40.8075,
          longitude: -73.9626
        },
        metadata: {
          totalPatients: 2800,
          totalAppointments: 5200,
          averageRating: 4.4
        }
      },
      {
        name: 'Mental Health Center',
        location: 'Wellness District, Therapeutic Area',
        address: '258 Mindful Avenue, Wellness District, New York, NY 10008',
        manager: 'Dr. Thomas Garcia',
        contact: '+1-555-0130',
        email: 'mental@hospital.com',
        operatingHours: '8:00 AM - 8:00 PM',
        services: ['Psychiatry', 'Psychology', 'Counseling', 'Crisis Intervention'],
        status: 'active',
        capacity: {
          beds: 20,
          rooms: 25,
          staff: 40
        },
        coordinates: {
          latitude: 40.7411,
          longitude: -73.9897
        },
        metadata: {
          totalPatients: 5500,
          totalAppointments: 16500,
          averageRating: 4.1
        }
      }
    ];

    // Insert all branches
    await Branch.insertMany(sampleBranches);
    console.log(`✅ Successfully created ${sampleBranches.length} sample branches`);

    // Show some statistics
    const totalBranches = await Branch.countDocuments();
    const activeBranches = await Branch.countDocuments({ status: 'active' });
    const maintenanceBranches = await Branch.countDocuments({ status: 'maintenance' });

    console.log(`📊 Total branches in database: ${totalBranches}`);
    console.log(`📊 Active branches: ${activeBranches}`);
    console.log(`📊 Maintenance branches: ${maintenanceBranches}`);

    // Calculate total capacity
    const capacityStats = await Branch.aggregate([
      {
        $group: {
          _id: null,
          totalBeds: { $sum: '$capacity.beds' },
          totalRooms: { $sum: '$capacity.rooms' },
          totalStaff: { $sum: '$capacity.staff' },
          averageRating: { $avg: '$metadata.averageRating' }
        }
      }
    ]);

    if (capacityStats.length > 0) {
      const stats = capacityStats[0];
      console.log(`📊 Total system capacity:`);
      console.log(`   - Beds: ${stats.totalBeds}`);
      console.log(`   - Rooms: ${stats.totalRooms}`);
      console.log(`   - Staff: ${stats.totalStaff}`);
      console.log(`   - Average Rating: ${stats.averageRating.toFixed(1)}/5.0`);
    }

  } catch (error) {
    console.error('❌ Error generating branch data:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await generateSampleBranches();
  mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

// Run the script
main().catch(console.error);
