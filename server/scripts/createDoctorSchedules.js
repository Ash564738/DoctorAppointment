const mongoose = require('mongoose');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Shift = require('../models/shiftModel');
require('dotenv').config();

async function addDoctorSchedules() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Function to map specializations to valid departments
    const mapToDepartment = (specialization) => {
      const mapping = {
        'Cardiology': 'Cardiology',
        'Dermatology': 'Dermatology', 
        'Neurology': 'Neurology',
        'Orthopedics': 'Orthopedics',
        'Pediatrics': 'Pediatrics',
        'Psychiatry': 'Psychiatry',
        'Ophthalmology': 'General', // Map to General as Ophthalmology is not in enum
        'Gastroenterology': 'General', // Map to General
        'Endocrinology': 'General', // Map to General
        'Oncology': 'General', // Map to General
        'Radiology': 'Radiology',
        'Emergency': 'Emergency'
      };
      return mapping[specialization] || 'General';
    };

    // Get all doctors
    const doctors = await Doctor.find({}).populate('userId', 'firstname lastname');
    console.log(`Found ${doctors.length} doctors in the database:`);
    
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. Dr. ${doctor.userId?.firstname} ${doctor.userId?.lastname} - ${doctor.specialization}`);
    });

    if (doctors.length === 0) {
      console.log('❌ No doctors found in the database. Please add doctors first.');
      process.exit(1);
    }

    // Delete existing shifts to start fresh
    await Shift.deleteMany({});
    console.log('🗑️ Cleared existing schedules');

    // Create schedules for each doctor
    const schedules = [];

    for (let i = 0; i < doctors.length; i++) {
      const doctor = doctors[i];
      
      // Create different schedule patterns for variety
      const schedulePatterns = [
        // Pattern 1: Monday-Friday, 9 AM - 5 PM
        {
          title: `${doctor.specialization} Consultation - Weekdays`,
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          maxPatientsPerHour: 4,
          slotDuration: 15,
          department: mapToDepartment(doctor.specialization),
          breakTime: {
            start: '12:00',
            end: '13:00'
          }
        },
        // Pattern 2: Saturday morning shift
        {
          title: `${doctor.specialization} Weekend Consultation`,
          startTime: '09:00',
          endTime: '13:00',
          daysOfWeek: ['Saturday'],
          maxPatientsPerHour: 3,
          slotDuration: 30,
          department: mapToDepartment(doctor.specialization),
          breakTime: {
            start: '11:00',
            end: '11:15'
          }
        }
      ];

      // Add emergency shifts for some doctors
      if (i % 3 === 0) { // Every third doctor gets emergency shifts
        schedulePatterns.push({
          title: `${doctor.specialization} Emergency Shift`,
          startTime: '18:00',
          endTime: '22:00',
          daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
          maxPatientsPerHour: 2,
          slotDuration: 30,
          department: 'Emergency',
          specialNotes: 'Emergency consultations only'
        });
      }

      // Create shifts for this doctor
      for (const pattern of schedulePatterns) {
        const shift = new Shift({
          doctorId: doctor.userId._id,
          ...pattern
        });
        schedules.push(shift);
      }
    }

    // Save all schedules
    const savedSchedules = await Shift.insertMany(schedules);
    console.log(`✅ Created ${savedSchedules.length} schedules for ${doctors.length} doctors`);

    // Display summary
    console.log('\n📅 Schedule Summary:');
    const allShifts = await Shift.find({}).populate('doctorId', 'firstname lastname');
    const summaryByDoctor = {};
    
    allShifts.forEach(shift => {
      const doctorName = `Dr. ${shift.doctorId.firstname} ${shift.doctorId.lastname}`;
      if (!summaryByDoctor[doctorName]) {
        summaryByDoctor[doctorName] = {
          count: 0,
          departments: new Set()
        };
      }
      summaryByDoctor[doctorName].count++;
      summaryByDoctor[doctorName].departments.add(shift.department);
    });

    Object.keys(summaryByDoctor).forEach(doctorName => {
      const summary = summaryByDoctor[doctorName];
      console.log(`- ${doctorName} - ${summary.count} shifts in ${Array.from(summary.departments).join(', ')}`);
    });

    console.log('\n🎉 Doctor schedules have been successfully added to the database!');
    
  } catch (error) {
    console.error('❌ Error adding doctor schedules:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

addDoctorSchedules();
