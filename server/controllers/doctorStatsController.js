const appointmentModel = require("../models/appointmentModel");
const userModel = require("../models/userModel");
const mongoose = require("mongoose");

// Get statistics for a doctor's dashboard
const getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Get current date and time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Prepare all queries for parallel execution
    const [
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      completedAppointments,
      canceledAppointments,
      monthlyAppointments,
      uniquePatients,
      upcomingAppointments
    ] = await Promise.all([
      // Total appointments for this doctor
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId)
      }),
      
      // Today's appointments
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: {
          $gte: today.toISOString(),
          $lt: tomorrow.toISOString()
        }
      }),
      
      // Pending appointments
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: "Pending"
      }),
      
      // Completed appointments
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: "Completed"
      }),
      
      // Canceled appointments
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: "Cancelled"
      }),
      
      // This month's appointments
      appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: {
          $gte: thisMonth.toISOString(),
          $lt: nextMonth.toISOString()
        }
      }),
      
      // Count unique patients
      appointmentModel.distinct('userId', {
        doctorId: new mongoose.Types.ObjectId(doctorId)
      }),
      
      // Get upcoming appointments
      appointmentModel.find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: { $gte: today.toISOString() },
        status: "Pending"
      })
      .sort({ date: 1 })
      .limit(5)
      .populate('userId', 'firstname lastname email phone')
      .lean()
    ]);

    const totalPatients = uniquePatients.length;

    // Calculate monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 0; i < 6; i++) {
      const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const count = await appointmentModel.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      });
      
      monthlyTrend.unshift({
        month: startDate.toLocaleString('default', { month: 'short' }),
        count
      });
    }

    // Format upcoming appointments for the response
    const formattedUpcoming = upcomingAppointments.map(appt => ({
      id: appt._id,
      patientName: appt.userId ? `${appt.userId.firstname || ''} ${appt.userId.lastname || ''}`.trim() : 'Unknown',
      patientEmail: appt.userId ? appt.userId.email : 'Unknown',
      date: appt.date,
      time: appt.time,
      status: appt.status,
      symptoms: appt.symptoms || 'Not specified'
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalAppointments,
          todayAppointments,
          pendingAppointments,
          completedAppointments,
          canceledAppointments,
          monthlyAppointments,
          totalPatients
        },
        monthlyTrend,
        upcomingAppointments: formattedUpcoming
      }
    });
  } catch (error) {
    console.error("Error in getDoctorStats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching doctor statistics",
      error: error.message
    });
  }
};

// Get patients who have appointments with this doctor
const getDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search || '';
    
    // Get unique patient IDs who have appointments with this doctor
    const patientIds = await appointmentModel.distinct('userId', {
      doctorId: new mongoose.Types.ObjectId(doctorId)
    });
    
    // Get total count of patients for pagination
    const totalPatients = patientIds.length;
    
    // Build search query for users if search term exists
    const searchQuery = searchTerm ? {
      _id: { $in: patientIds },
      $or: [
        { firstname: { $regex: searchTerm, $options: 'i' } },
        { lastname: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    } : { _id: { $in: patientIds } };

    // Get paginated list of patients
    const users = await userModel.find(searchQuery, {
      password: 0,
      __v: 0,
    })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get patient details and their appointment history
    const patients = await Promise.all(users.map(async (user) => {
      // Get all appointments for this patient with this doctor
      const appointments = await appointmentModel.find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        userId: new mongoose.Types.ObjectId(user._id)
      })
        .sort({ date: -1 })
        .lean();

      const latestAppointment = appointments[0] || null;
      const completedAppointmentsCount = appointments.filter(a => a.status === "Completed").length;
      const canceledAppointmentsCount = appointments.filter(a => a.status === "Cancelled").length;
      const pendingAppointmentsCount = appointments.filter(a => a.status === "Pending").length;
      
      // Get medical history summary
      const medicalSummary = appointments.filter(a => a.diagnosis || a.symptoms).map(a => ({
        date: a.date,
        diagnosis: a.diagnosis || 'Not provided',
        symptoms: a.symptoms || 'Not specified',
        notes: a.notes || ''
      }));
      
      return {
        id: user._id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email,
        phone: user.phone || 'Not provided',
        age: user.age || 'N/A',
        gender: user.gender || 'Not specified',
        address: user.address || 'Not provided',
        createdAt: user.createdAt,
        lastVisit: latestAppointment ? latestAppointment.date : null,
        appointmentsStats: {
          total: appointments.length,
          completed: completedAppointmentsCount,
          canceled: canceledAppointmentsCount,
          pending: pendingAppointmentsCount
        },
        latestAppointmentDetails: latestAppointment,
        medicalHistory: medicalSummary,
        status: pendingAppointmentsCount > 0 ? 'Active' : 'Inactive'
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        patients,
        pagination: {
          total: totalPatients,
          page,
          limit,
          pages: Math.ceil(totalPatients / limit)
        }
      }
    });
  } catch (error) {
    console.error("Error in getDoctorPatients:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching doctor's patients",
      error: error.message
    });
  }
};

// Get doctor performance analysis
const getDoctorPerformance = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const timeRange = req.query.range || 'month'; // day, week, month, year
    
    const today = new Date();
    let startDate, endDate;
    
    // Set date range based on query parameter
    switch(timeRange) {
      case 'day':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of current week
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Start of current year
        endDate = new Date(today);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of current month
        endDate = new Date(today);
    }
    
    // Get all appointments in the selected time range
    const appointments = await appointmentModel.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      }
    }).lean();
    
    // Calculate completion rate
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === "Completed").length;
    const cancelled = appointments.filter(a => a.status === "Cancelled").length;
    const pending = appointments.filter(a => a.status === "Pending").length;
    
    const completionRate = total > 0 ? (completed / total * 100).toFixed(2) : 0;
    const cancellationRate = total > 0 ? (cancelled / total * 100).toFixed(2) : 0;
    
    // Calculate average appointment duration if available
    let avgDuration = 'N/A';
    const completedWithDuration = appointments.filter(a => 
      a.status === "Completed" && a.startTime && a.endTime);
    
    if (completedWithDuration.length > 0) {
      const totalMinutes = completedWithDuration.reduce((sum, appt) => {
        const startTime = new Date(appt.startTime);
        const endTime = new Date(appt.endTime);
        const diffMinutes = (endTime - startTime) / (1000 * 60);
        return sum + diffMinutes;
      }, 0);
      
      avgDuration = `${Math.round(totalMinutes / completedWithDuration.length)} minutes`;
    }
    
    // Calculate busiest days of week
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    
    appointments.forEach(appt => {
      const date = new Date(appt.date);
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      dayCount[day]++;
    });
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busiestDays = dayCount.map((count, index) => ({
      day: daysOfWeek[index],
      count
    })).sort((a, b) => b.count - a.count);
    
    // Patient satisfaction calculation - if ratings are available
    let patientSatisfaction = 'N/A';
    const appointmentsWithRating = appointments.filter(a => a.rating && a.rating > 0);
    
    if (appointmentsWithRating.length > 0) {
      const totalRating = appointmentsWithRating.reduce((sum, appt) => sum + appt.rating, 0);
      patientSatisfaction = (totalRating / appointmentsWithRating.length).toFixed(1) + ' / 5.0';
    }
    
    res.status(200).json({
      success: true,
      data: {
        timeRange,
        period: {
          start: startDate,
          end: endDate
        },
        overview: {
          total,
          completed,
          cancelled,
          pending,
          completionRate: `${completionRate}%`,
          cancellationRate: `${cancellationRate}%`
        },
        performance: {
          averageDuration: avgDuration,
          patientSatisfaction
        },
        insights: {
          busiestDays: busiestDays.slice(0, 3), // Top 3 busiest days
        }
      }
    });
    
  } catch (error) {
    console.error("Error in getDoctorPerformance:", error);
    res.status(500).json({
      success: false,
      message: "Error analyzing doctor performance",
      error: error.message
    });
  }
};

module.exports = {
  getDoctorStats,
  getDoctorPatients,
  getDoctorPerformance
};
