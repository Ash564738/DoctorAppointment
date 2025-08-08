const nodemailer = require('nodemailer');
const twilio = require('twilio');

const sendAppointmentReminder = async (appointment) => {
  // Email reminder
  await transporter.sendMail({
    to: appointment.userEmail,
    subject: 'Appointment Reminder',
    html: appointmentTemplate(appointment)
  });
  
  // SMS reminder
  await twilioClient.messages.create({
    body: `Reminder: You have an appointment tomorrow at ${appointment.time}`,
    to: appointment.userPhone,
    from: process.env.TWILIO_PHONE
  });
};