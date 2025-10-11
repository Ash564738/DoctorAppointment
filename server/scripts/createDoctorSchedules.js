const mongoose = require('mongoose');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Shift = require('../models/shiftModel');
require('dotenv').config();

// Advanced shift configuration based on frontend CreateShiftModal
const SHIFT_CONFIGS = {
  day8: {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  evening8: {
    startTime: "16:00",
    endTime: "23:00",
    breakStart: "20:00",
    breakEnd: "21:00",
    slotDuration: 30,
    maxPatientsPerHour: 3,
  },
  night8: {
    startTime: "23:00",
    endTime: "07:00",
    breakStart: "03:00",
    breakEnd: "03:30",
    slotDuration: 45,
    maxPatientsPerHour: 2,
  },
  day12: {
    startTime: "07:00",
    endTime: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  night12: {
    startTime: "19:00",
    endTime: "07:00",
    breakStart: "00:00",
    breakEnd: "00:30",
    slotDuration: 60,
    maxPatientsPerHour: 2,
  },
  emergency: {
    startTime: "18:00",
    endTime: "06:00",
    breakStart: "00:00",
    breakEnd: "00:30",
    slotDuration: 30,
    maxPatientsPerHour: 6,
  },
  surgery: {
    startTime: "06:00",
    endTime: "14:00",
    breakStart: "10:00",
    breakEnd: "10:15",
    slotDuration: 60,
    maxPatientsPerHour: 1,
  },
  consultation: {
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "12:30",
    breakEnd: "13:30",
    slotDuration: 30,
    maxPatientsPerHour: 3,
  },
  weekend: {
    startTime: "10:00",
    endTime: "14:00",
    slotDuration: 45,
    maxPatientsPerHour: 2,
  }
};
const DEPARTMENT_PATTERNS = {
  'Emergency': ['emergency', 'night12', 'day12'],
  'Surgery': ['surgery', 'day8', 'consultation'],
  'Cardiology': ['consultation', 'day8', 'emergency'],
  'Neurology': ['consultation', 'day12', 'surgery'],
  'Pediatrics': ['day8', 'consultation', 'weekend'],
  'Orthopedics': ['surgery', 'day8', 'consultation'],
  'Psychiatry': ['consultation', 'day8', 'evening8'],
  'Dermatology': ['consultation', 'day8', 'weekend'],
  'Radiology': ['day12', 'night8', 'weekend'],
  'General': ['consultation', 'day8', 'weekend']
};
const SPECIALIZATION_CONFIGS = {
  'Emergency Medicine Physicians': {
    primaryShifts: ['emergency', 'night12'],
    maxPatientsPerHour: 8,
    emergencyWeight: 0.8
  },
  'General Surgeons': {
    primaryShifts: ['surgery', 'day8'],
    maxPatientsPerHour: 1,
    surgeryWeight: 0.7
  },
  'Cardiologists': {
    primaryShifts: ['consultation', 'day8'],
    maxPatientsPerHour: 3,
    consultationWeight: 0.6
  },
  'Pediatricians': {
    primaryShifts: ['day8', 'consultation'],
    maxPatientsPerHour: 5,
    weekendWeight: 0.4
  },
  'Psychiatrists': {
    primaryShifts: ['consultation', 'evening8'],
    maxPatientsPerHour: 2,
    eveningWeight: 0.5
  },
  'Neurologists': {
    primaryShifts: ['consultation', 'surgery'],
    maxPatientsPerHour: 2,
    consultationWeight: 0.7
  },
  'Orthopedic Surgeons': {
    primaryShifts: ['surgery', 'day8'],
    maxPatientsPerHour: 1,
    surgeryWeight: 0.8
  },
  'Dermatologists': {
    primaryShifts: ['consultation', 'day8'],
    maxPatientsPerHour: 4,
    weekendWeight: 0.3
  }
};

// Helper function to check for schedule conflicts
function hasTimeConflict(existingShifts, newShift) {
  return existingShifts.some(existing => {
    // Check if they share any days
    const sharedDays = existing.daysOfWeek.some(day => newShift.daysOfWeek.includes(day));
    if (!sharedDays) return false;
    
    // Check for time overlap
    const existingStart = new Date(`2000-01-01T${existing.startTime}:00`);
    const existingEnd = new Date(`2000-01-01T${existing.endTime}:00`);
    const newStart = new Date(`2000-01-01T${newShift.startTime}:00`);
    const newEnd = new Date(`2000-01-01T${newShift.endTime}:00`);
    
    return (newStart < existingEnd && newEnd > existingStart);
  });
}

// Generate personalized shifts for a doctor
function generateDoctorShifts(doctor, doctorIndex) {
  const shifts = [];
  const department = doctor.department || 'General';
  const specialization = doctor.specialization || 'General';
  const nextDay = (day) => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const idx = days.indexOf(day);
    return idx === -1 ? day : days[(idx + 1) % 7];
  };
  const departmentPatterns = DEPARTMENT_PATTERNS[department] || DEPARTMENT_PATTERNS['General'];
  const specializationConfig = SPECIALIZATION_CONFIGS[specialization] || {};
  const shiftTypes = specializationConfig.primaryShifts || departmentPatterns;
  const shiftVariations = [
    {
      type: shiftTypes[0],
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      title: `${specialization} - Primary Care`
    },
    {
      type: shiftTypes[doctorIndex % shiftTypes.length],
      days: doctorIndex % 2 === 0 ? ['Monday', 'Wednesday', 'Friday'] : ['Tuesday', 'Thursday'],
      title: `${specialization} - Extended Hours`
    },
    ...(doctorIndex % 3 === 0 ? [{
      type: 'weekend',
      days: ['Saturday'],
      title: `${specialization} - Weekend Coverage`
    }] : []),
    ...(doctorIndex % 4 === 0 ? [{
      type: 'emergency',
      days: ['Sunday'],
      title: `${specialization} - Emergency Coverage`
    }] : [])
  ];

  shiftVariations.forEach(variation => {
    const config = SHIFT_CONFIGS[variation.type];
    if (!config) return;
    const [sH, sM] = config.startTime.split(':').map(Number);
    const [eH, eM] = config.endTime.split(':').map(Number);
    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;
    const hasBreak = !!(config.breakStart && config.breakEnd);
    const [bSH, bSM] = (config.breakStart || '00:00').split(':').map(Number);
    const [bEH, bEM] = (config.breakEnd || '00:00').split(':').map(Number);
    const breakStartTotal = bSH * 60 + bSM;
    const breakEndTotal = bEH * 60 + bEM;
    if (endTotal <= startTotal) {
      const maxPatientsPerHour = specializationConfig.maxPatientsPerHour || config.maxPatientsPerHour;
      const part1 = {
        title: `${variation.title} (Overnight P1)`,
        startTime: config.startTime,
        endTime: '23:59',
        daysOfWeek: variation.days,
        maxPatientsPerHour,
        slotDuration: config.slotDuration,
        department: department,
        status: 'approved',
        isActive: true,
        specialNotes: `${variation.type} shift for ${specialization} specialist (part 1)`
      };
      if (hasBreak && breakStartTotal >= startTotal) {
        part1.breakTime = { start: config.breakStart, end: config.breakEnd };
      }
      shifts.push(part1);
      const part2Days = variation.days.map(nextDay);
      const part2 = {
        title: `${variation.title} (Overnight P2)`,
        startTime: '00:00',
        endTime: config.endTime,
        daysOfWeek: part2Days,
        maxPatientsPerHour,
        slotDuration: config.slotDuration,
        department: department,
        status: 'approved',
        isActive: true,
        specialNotes: `${variation.type} shift for ${specialization} specialist (part 2)`
      };
      if (hasBreak && breakStartTotal < startTotal) {
        part2.breakTime = { start: config.breakStart, end: config.breakEnd };
      }
      shifts.push(part2);
      return;
    }
    const maxPatientsPerHour = specializationConfig.maxPatientsPerHour || config.maxPatientsPerHour;
    shifts.push({
      title: variation.title,
      startTime: config.startTime,
      endTime: config.endTime,
      daysOfWeek: variation.days,
      maxPatientsPerHour,
      slotDuration: config.slotDuration,
      department: department,
      status: 'approved',
      isActive: true,
      ...(config.breakStart && config.breakEnd ? {
        breakTime: {
          start: config.breakStart,
          end: config.breakEnd
        }
      } : {}),
      specialNotes: `${variation.type} shift for ${specialization} specialist`
    });
  });

  return shifts;
}

async function addDoctorSchedules() {
  try {
    const preserveExisting = process.argv.includes('--preserve-existing');
    const mergeMode = process.argv.includes('--merge');
    const updateOnly = process.argv.includes('--update-only');
    const specificDoctor = process.argv.find(arg => arg.startsWith('--doctor='))?.split('=')[1];

    console.log('🏥 Doctor Schedule Creation Script');
    console.log('================================');
    
    if (preserveExisting) {
      console.log('📋 Mode: Preserve existing - only adding for doctors without shifts');
    } else if (mergeMode) {
      console.log('🔄 Mode: Merge - adding new shifts alongside existing ones');
    } else if (updateOnly) {
      console.log('🔧 Mode: Update only - modifying doctors with existing shifts');
    } else if (specificDoctor) {
      console.log(`👨‍⚕️ Mode: Specific doctor - targeting "${specificDoctor}"`);
    } else {
      console.log('🔄 Mode: Replace all - clearing existing schedules');
    }
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get all approved doctors
    let doctors = await Doctor.find({ isDoctor: true }).populate('userId', 'firstname lastname');
    
    // Filter for specific doctor if requested
    if (specificDoctor) {
      doctors = doctors.filter(doctor => {
        const fullName = `${doctor.userId?.firstname} ${doctor.userId?.lastname}`.toLowerCase();
        return fullName.includes(specificDoctor.toLowerCase()) || 
               doctor.userId?.firstname?.toLowerCase().includes(specificDoctor.toLowerCase()) ||
               doctor.userId?.lastname?.toLowerCase().includes(specificDoctor.toLowerCase());
      });
      
      if (doctors.length === 0) {
        console.log(`❌ No doctor found matching "${specificDoctor}"`);
        process.exit(1);
      }
    }
    
    console.log(`Found ${doctors.length} approved doctors in the database:`);
    
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. Dr. ${doctor.userId?.firstname} ${doctor.userId?.lastname} - ${doctor.specialization}`);
    });

    if (doctors.length === 0) {
      console.log('❌ No approved doctors found in the database. Please ensure doctors are approved first.');
      process.exit(1);
    }

    // Handle existing shifts based on mode
    if (!preserveExisting && !mergeMode && !updateOnly && !specificDoctor) {
      const deletedCount = await Shift.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing schedules`);
    } else if (mergeMode) {
      console.log('🔄 Merge mode: Adding new shifts alongside existing ones');
    } else if (updateOnly) {
      console.log('🔧 Update mode: Only modifying doctors with existing shifts');
    } else if (specificDoctor && !preserveExisting && !mergeMode) {
      // Clear shifts only for the specific doctor
      const deletedCount = await Shift.deleteMany({ 
        doctorId: { $in: doctors.map(d => d.userId._id) } 
      });
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing schedules for specified doctor(s)`);
    } else {
      console.log('📋 Preserving existing schedules - only adding for doctors without shifts');
    }

    // Create schedules for each doctor
    const schedules = [];
    let skipCount = 0;

    for (let i = 0; i < doctors.length; i++) {
      const doctor = doctors[i];
      
      // Check existing shifts for this doctor
      const existingShifts = await Shift.find({ doctorId: doctor.userId._id });
      
      // Handle different modes
      if (preserveExisting && existingShifts.length > 0) {
        console.log(`⏭️ Skipping Dr. ${doctor.userId.firstname} ${doctor.userId.lastname} - already has ${existingShifts.length} shifts`);
        skipCount++;
        continue;
      }
      
      if (updateOnly && existingShifts.length === 0) {
        console.log(`⏭️ Skipping Dr. ${doctor.userId.firstname} ${doctor.userId.lastname} - no existing shifts to update`);
        skipCount++;
        continue;
      }
      
      if (mergeMode && existingShifts.length > 0) {
        console.log(`🔄 Adding shifts for Dr. ${doctor.userId.firstname} ${doctor.userId.lastname} (has ${existingShifts.length} existing)`);
      } else {
        console.log(`👨‍⚕️ Creating personalized schedules for Dr. ${doctor.userId.firstname} ${doctor.userId.lastname} (${doctor.specialization})`);
      }
      
      // Generate personalized shifts based on specialization and department
      const schedulePatterns = generateDoctorShifts(doctor, i);
      
      console.log(`   📋 Generated ${schedulePatterns.length} shift patterns for ${doctor.specialization} specialist`);

      // Create shifts for this doctor
      for (const pattern of schedulePatterns) {
        try {
          // In merge mode, check for conflicts with existing shifts
          if (mergeMode && existingShifts.length > 0) {
            if (hasTimeConflict(existingShifts, pattern)) {
              console.log(`   ⚠️ Skipping conflicting shift: ${pattern.title}`);
              continue;
            }
          }
          
          const shift = new Shift({
            doctorId: doctor.userId._id,
            ...pattern
          });
          schedules.push(shift);
        } catch (error) {
          console.error(`❌ Error creating shift for Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}:`, error.message);
        }
      }
    }

    // Save all schedules
    if (schedules.length === 0) {
      console.log(`❌ No valid schedules to create. ${preserveExisting ? 'All doctors already have shifts.' : 'No approved doctors found.'}`);
      return;
    }

  // Use ordered:false so one invalid doc doesn't abort the whole batch
  const savedSchedules = await Shift.insertMany(schedules, { ordered: false });
    console.log(`✅ Created ${savedSchedules.length} schedules for ${doctors.length - skipCount} doctors`);
    if (skipCount > 0) {
      console.log(`⏭️ Skipped ${skipCount} doctors with existing shifts`);
    }

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
      console.log(`- ${doctorName}: ${summary.count} shifts in ${Array.from(summary.departments).join(', ')}`);
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
