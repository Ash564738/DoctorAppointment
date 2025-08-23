const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/doctorappointment', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');
const MedicalRecord = require('../models/medicalRecordModel');

async function createSampleMedicalRecords() {
  try {
    // Get James Anderson (the test patient)
    const patient = await User.findOne({ email: "patient1@example.com" });
    if (!patient) {
      console.log('Patient not found');
      return;
    }

    // Get some completed appointments for this patient
    const appointments = await Appointment.find({ 
      userId: patient._id, 
      status: 'Completed' 
    }).populate('doctorId');

    if (appointments.length === 0) {
      console.log('No completed appointments found for patient');
      return;
    }

    // Create medical records for completed appointments
    for (let appointment of appointments) {
      // Check if medical record already exists
      const existingRecord = await MedicalRecord.findOne({ appointmentId: appointment._id });
      if (existingRecord) {
        console.log(`Medical record already exists for appointment ${appointment._id}`);
        continue;
      }

      const medicalRecord = new MedicalRecord({
        patientId: patient._id,
        doctorId: appointment.doctorId._id,
        appointmentId: appointment._id,
        visitDate: appointment.date,
        chiefComplaint: appointment.symptoms || 'Regular checkup',
        historyOfPresentIllness: 'Patient presented with symptoms as mentioned in chief complaint.',
        assessment: 'Patient appears stable. Vital signs within normal limits.',
        diagnosis: [
          {
            description: 'General consultation',
            type: 'primary'
          },
          {
            description: 'Follow-up care',
            type: 'secondary'
          }
        ],
        treatment: 'Advised rest and monitoring. Follow-up as needed.',
        vitalSigns: {
          bloodPressure: {
            systolic: 120 + Math.floor(Math.random() * 20),
            diastolic: 80 + Math.floor(Math.random() * 15)
          },
          heartRate: 70 + Math.floor(Math.random() * 20),
          temperature: 98.6 + (Math.random() * 2 - 1),
          weight: 70 + Math.floor(Math.random() * 20),
          height: 170 + Math.floor(Math.random() * 20)
        },
        prescriptions: [
          {
            medication: 'Acetaminophen',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '5 days',
            instructions: 'Take with food'
          }
        ],
        followUp: {
          required: true,
          period: '2 weeks',
          instructions: 'Schedule follow-up if symptoms persist'
        }
      });

      // Calculate BMI
      if (medicalRecord.vitalSigns.height && medicalRecord.vitalSigns.weight) {
        const heightInMeters = medicalRecord.vitalSigns.height / 100;
        medicalRecord.vitalSigns.bmi = parseFloat(
          (medicalRecord.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1)
        );
      }

      await medicalRecord.save();
      console.log(`Created medical record for appointment on ${appointment.date}`);
    }

    console.log('Sample medical records created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample medical records:', error);
    process.exit(1);
  }
}

createSampleMedicalRecords();
