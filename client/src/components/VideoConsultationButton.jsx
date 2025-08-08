import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaVideo, FaCalendarPlus } from 'react-icons/fa';

const VideoConsultationButton = ({ appointment, userRole }) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const createVideoConsultation = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${process.env.REACT_APP_SERVER_URL}/api/video-consultations`,
                {
                    appointmentId: appointment._id,
                    scheduledStartTime: appointment.date,
                    duration: 30
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                toast.success('Video consultation created successfully!');
                navigate(`/video-consultation/${response.data.data._id}`);
            }
        } catch (error) {
            console.error('Error creating video consultation:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to create video consultation');
            }
        } finally {
            setLoading(false);
        }
    };

    const joinExistingConsultation = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Find existing consultation for this appointment
            const response = await axios.get(
                `${process.env.REACT_APP_SERVER_URL}/api/video-consultations?appointmentId=${appointment._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success && response.data.data.length > 0) {
                const consultation = response.data.data[0];
                navigate(`/video-consultation/${consultation._id}`);
            } else {
                // No existing consultation, create one
                await createVideoConsultation();
            }
        } catch (error) {
            console.error('Error checking for existing consultation:', error);
            // If error checking, try to create a new one
            await createVideoConsultation();
        } finally {
            setLoading(false);
        }
    };

    // Only show for confirmed appointments
    if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
        return null;
    }

    // Check if appointment time is within consultation window (30 minutes before to 2 hours after)
    const appointmentTime = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    const isWithinWindow = minutesDiff >= -120 && minutesDiff <= 30; // 2 hours after to 30 minutes before

    if (!isWithinWindow && appointment.status !== 'completed') {
        return (
            <div className="video-consultation-info">
                <FaVideo style={{ color: '#ccc', marginRight: '5px' }} />
                <small style={{ color: '#666' }}>
                    Video consultation available 30min before appointment
                </small>
            </div>
        );
    }

    return (
        <div className="video-consultation-actions">
            <button
                onClick={joinExistingConsultation}
                disabled={loading}
                className="btn-video-consultation"
                title={appointment.status === 'completed' ? 'View consultation details' : 'Start/Join video consultation'}
            >
                {loading ? (
                    <div className="loading-spinner-small"></div>
                ) : (
                    <>
                        <FaVideo />
                        {appointment.status === 'completed' ? 'View Consultation' : 'Start Video Call'}
                    </>
                )}
            </button>
        </div>
    );
};

export default VideoConsultationButton;
