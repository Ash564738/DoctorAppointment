import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import fetchData from '../helper/apiCall';
import toast from 'react-hot-toast';
import '../styles/reminder.css';

const AppointmentReminder = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [showReminder, setShowReminder] = useState(false);
  const { user } = useSelector((state) => state.root);

  useEffect(() => {
    if (user) {
      checkUpcomingAppointments();
      // Check every 30 minutes
      const interval = setInterval(checkUpcomingAppointments, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkUpcomingAppointments = async () => {
    try {
      const appointments = await fetchData("/appointment/getallappointments");
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter appointments for today and tomorrow
      const upcoming = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        
        return (
          appointment.status.toLowerCase() === 'pending' &&
          appointmentDate >= today &&
          appointmentDate <= tomorrowDate
        );
      });

      if (upcoming.length > 0) {
        setUpcomingAppointments(upcoming);
        setShowReminder(true);
        
        // Show toast notification for immediate appointments (within 2 hours)
        const immediateAppointments = upcoming.filter(appointment => {
          const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
          const timeDiff = appointmentDateTime.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 3600);
          return hoursDiff <= 2 && hoursDiff > 0;
        });

        if (immediateAppointments.length > 0) {
          immediateAppointments.forEach(appointment => {
            const doctorName = user.role === 'Doctor' 
              ? `${appointment.userId?.firstname} ${appointment.userId?.lastname}`
              : `Dr. ${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}`;
            
            toast.success(
              `Reminder: You have an appointment with ${doctorName} at ${appointment.time} today!`,
              { duration: 8000 }
            );
          });
        }
      }
    } catch (error) {
      console.error('Error checking upcoming appointments:', error);
    }
  };

  const dismissReminder = () => {
    setShowReminder(false);
  };

  const formatAppointmentTime = (date, time) => {
    const appointmentDate = new Date(date);
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    
    return isToday ? `Today at ${time}` : `Tomorrow at ${time}`;
  };

  if (!showReminder || upcomingAppointments.length === 0) {
    return null;
  }

  return (
    <div className="appointment-reminder">
      <div className="reminder-header">
        <h4>📅 Upcoming Appointments</h4>
        <button className="dismiss-btn" onClick={dismissReminder}>×</button>
      </div>
      
      <div className="reminder-content">
        {upcomingAppointments.map((appointment, index) => {
          const otherPerson = user.role === 'Doctor' 
            ? `${appointment.userId?.firstname} ${appointment.userId?.lastname}`
            : `Dr. ${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}`;
          
          return (
            <div key={appointment._id} className="reminder-item">
              <div className="reminder-info">
                <span className="reminder-person">{otherPerson}</span>
                <span className="reminder-time">
                  {formatAppointmentTime(appointment.date, appointment.time)}
                </span>
              </div>
              <div className="reminder-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    // Navigate to appointments or chat
                    window.location.href = user.role === 'Doctor' ? '/appointments' : '/my-appointments';
                  }}
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="reminder-footer">
        <small>
          Tip: Enable browser notifications for appointment reminders
        </small>
      </div>
    </div>
  );
};

export default AppointmentReminder;
