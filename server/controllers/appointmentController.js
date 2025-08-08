const Appointment = require("../models/appointmentModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");

const getallappointments = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [{ userId: req.query.search }, { doctorId: req.query.search }],
        }
      : {};

    const appointments = await Appointment.find(keyword)
      .populate("doctorId")
      .populate("userId");

    // Calculate age for populated user data
    const appointmentsWithCalculatedAge = appointments.map(appointment => {
      const appointmentObj = appointment.toObject();

      if (appointmentObj.userId && appointmentObj.userId.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(appointmentObj.userId.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        appointmentObj.userId.age = age;
      }

      return appointmentObj;
    });

    return res.send(appointmentsWithCalculatedAge);
  } catch (error) {
    res.status(500).send("Unable to get apponintments");
  }
};

const bookappointment = async (req, res) => {
  try {
    // Validate required fields
    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID, date, and time are required"
      });
    }

    const appointment = await Appointment({
      date: req.body.date,
      time: req.body.time,
      symptoms: req.body.symptoms,
      doctorId: req.body.doctorId,
      userId: req.locals,
    });

    const usernotification = Notification({
      userId: req.locals,
      content: `You booked an appointment with Dr. ${req.body.doctorname} for ${req.body.date} ${req.body.time}`,
    });

    await usernotification.save();

    const user = await User.findById(req.locals);

    const doctornotification = Notification({
      userId: req.body.doctorId,
      content: `You have an appointment with ${user.firstname} ${user.lastname} on ${req.body.date} at ${req.body.time}. Patient Age: ${user.age || 'Not specified'}, Blood Group: ${user.bloodGroup || 'Not specified'}, Gender: ${user.gender || 'Not specified'}, Mobile: ${user.mobile || 'Not specified'}. Symptoms: ${req.body.symptoms}` ,
    });

    await doctornotification.save();

    const result = await appointment.save();
    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: result
    });
  } catch (error) {
    logger.error('Error booking appointment:', error);
    res.status(500).send("Unable to book appointment");
  }
};

const completed = async (req, res) => {
  try {
    const alreadyFound = await Appointment.findOneAndUpdate(
      { _id: req.body.appointid },
      { status: "Completed" }
    );

    const usernotification = Notification({
      userId: req.locals,
      content: `Your appointment with ${req.body.doctorname} has been completed`,
    });

    await usernotification.save();

    const user = await User.findById(req.locals);

    const doctornotification = Notification({
      userId: req.body.doctorId,
      content: `Your appointment with ${user.firstname} ${user.lastname} has been completed`,
    });

    await doctornotification.save();

    return res.status(201).send("Appointment completed");
  } catch (error) {
    res.status(500).send("Unable to complete appointment");
  }
};

module.exports = {
  getallappointments,
  bookappointment,
  completed,
};
