const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/doctorappointment', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');

async function createSampleAppointments() {
  try {
    // Get some doctors and patients
    const doctors = await User.find({ role: "Doctor" }).limit(3);
    const patients = await User.find({ role: "Patient" }).limit(5);

    if (doctors.length === 0 || patients.length === 0) {
      console.log('No doctors or patients found to create appointments');
      return;
    }

    const appointmentStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    const sampleSymptoms = [
      'Headache and fever',
      'Chest pain and shortness of breath',
      'Abdominal pain',
      'Back pain and stiffness',
      'Cough and cold symptoms',
      'Skin rash and itching',
      'Joint pain and swelling',
      'Dizziness and nausea',
      'Fatigue and weakness',
      'Regular health checkup'
    ];
    const sampleAppointments = [];

    // Create 20 sample appointments
    for (let i = 0; i < 20; i++) {
      const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
      const randomPatient = patients[Math.floor(Math.random() * patients.length)];
      const randomStatus = appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)];
      const randomSymptoms = sampleSymptoms[Math.floor(Math.random() * sampleSymptoms.length)];
      
      // Create dates within the last 30 days
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));

      sampleAppointments.push({
        doctorId: randomDoctor._id,
        userId: randomPatient._id,
        date: randomDate,
        time: `${9 + Math.floor(Math.random() * 8)}:00`, // 9 AM to 4 PM
        symptoms: randomSymptoms,
        status: randomStatus,
        createdAt: randomDate,
        updatedAt: randomDate
      });
    }

    await Appointment.insertMany(sampleAppointments);
    console.log(`Created ${sampleAppointments.length} sample appointments`);

    // Check the results
    const totalAppointments = await Appointment.countDocuments();
    const statusCounts = await Appointment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    console.log(`Total appointments now: ${totalAppointments}`);
    console.log('Appointment status breakdown:');
    statusCounts.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating appointments:', error);
    mongoose.connection.close();
  }
}

createSampleAppointments();
