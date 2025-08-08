import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaClock, FaPlus } from 'react-icons/fa';

const WaitlistButton = ({ doctor, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        preferredDate: '',
        preferredTime: '',
        appointmentType: 'routine',
        notes: '',
        priority: 'normal',
        isFlexible: false,
        flexibilityOptions: {
            acceptDifferentTimes: false,
            acceptDifferentDates: false,
            timeRange: { start: '', end: '' },
            dateRange: { start: '', end: '' }
        }
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('flexibility.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                flexibilityOptions: {
                    ...prev.flexibilityOptions,
                    [field]: type === 'checkbox' ? checked : value
                }
            }));
        } else if (name.startsWith('timeRange.') || name.startsWith('dateRange.')) {
            const [rangeType, field] = name.split('.');
            setFormData(prev => ({
                ...prev,
                flexibilityOptions: {
                    ...prev.flexibilityOptions,
                    [rangeType]: {
                        ...prev.flexibilityOptions[rangeType],
                        [field]: value
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const joinWaitlist = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${process.env.REACT_APP_SERVER_URL}/api/waitlist/join`,
                {
                    doctor: doctor._id,
                    ...formData
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                toast.success(`Successfully joined waitlist! You are #${response.data.data.position} in queue.`);
                setShowModal(false);
                if (onSuccess) onSuccess(response.data.data);
            }
        } catch (error) {
            console.error('Error joining waitlist:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to join waitlist');
            }
        } finally {
            setLoading(false);
        }
    };

    // Set default date to tomorrow
    React.useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData(prev => ({
            ...prev,
            preferredDate: tomorrow.toISOString().split('T')[0]
        }));
    }, []);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="btn-waitlist"
                title={`Join waitlist for Dr. ${doctor.firstname} ${doctor.lastname}`}
            >
                <FaClock />
                Join Waitlist
            </button>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Join Waitlist - Dr. {doctor.firstname} {doctor.lastname}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={joinWaitlist} className="join-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="preferredDate">Preferred Date *</label>
                                    <input
                                        type="date"
                                        id="preferredDate"
                                        name="preferredDate"
                                        value={formData.preferredDate}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="preferredTime">Preferred Time *</label>
                                    <input
                                        type="time"
                                        id="preferredTime"
                                        name="preferredTime"
                                        value={formData.preferredTime}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="appointmentType">Appointment Type</label>
                                    <select
                                        id="appointmentType"
                                        name="appointmentType"
                                        value={formData.appointmentType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="routine">Routine Checkup</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="followup">Follow-up</option>
                                        <option value="consultation">Consultation</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="priority">Priority</label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleInputChange}
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">Notes (symptoms, reason for visit)</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Please describe your symptoms or reason for the visit..."
                                    rows="3"
                                />
                            </div>

                            <div className="flexibility-options">
                                <h4>Flexibility Options</h4>
                                
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            name="isFlexible"
                                            checked={formData.isFlexible}
                                            onChange={handleInputChange}
                                        />
                                        I am flexible with appointment timing
                                    </label>
                                </div>

                                {formData.isFlexible && (
                                    <>
                                        <div className="form-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="flexibility.acceptDifferentTimes"
                                                    checked={formData.flexibilityOptions.acceptDifferentTimes}
                                                    onChange={handleInputChange}
                                                />
                                                Accept different times on the same day
                                            </label>
                                            
                                            {formData.flexibilityOptions.acceptDifferentTimes && (
                                                <div className="flexible-time-range">
                                                    <input
                                                        type="time"
                                                        name="timeRange.start"
                                                        value={formData.flexibilityOptions.timeRange.start}
                                                        onChange={handleInputChange}
                                                        placeholder="From"
                                                    />
                                                    <span>to</span>
                                                    <input
                                                        type="time"
                                                        name="timeRange.end"
                                                        value={formData.flexibilityOptions.timeRange.end}
                                                        onChange={handleInputChange}
                                                        placeholder="To"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="flexibility.acceptDifferentDates"
                                                    checked={formData.flexibilityOptions.acceptDifferentDates}
                                                    onChange={handleInputChange}
                                                />
                                                Accept different dates
                                            </label>
                                            
                                            {formData.flexibilityOptions.acceptDifferentDates && (
                                                <div className="flexible-date-range">
                                                    <input
                                                        type="date"
                                                        name="dateRange.start"
                                                        value={formData.flexibilityOptions.dateRange.start}
                                                        onChange={handleInputChange}
                                                        min={new Date().toISOString().split('T')[0]}
                                                    />
                                                    <span>to</span>
                                                    <input
                                                        type="date"
                                                        name="dateRange.end"
                                                        value={formData.flexibilityOptions.dateRange.end}
                                                        onChange={handleInputChange}
                                                        min={formData.flexibilityOptions.dateRange.start || new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary"
                                >
                                    {loading ? 'Joining...' : 'Join Waitlist'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .btn-waitlist {
                    background: #ffc107;
                    color: #212529;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }

                .btn-waitlist:hover {
                    background: #e0a800;
                    transform: translateY(-1px);
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .modal {
                    background: white;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e9ecef;
                }

                .modal-header h3 {
                    margin: 0;
                    color: #2c3e50;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #6c757d;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 4px;
                }

                .close-btn:hover {
                    background: #f8f9fa;
                }

                .join-form {
                    padding: 1.5rem;
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #495057;
                }

                .form-group input,
                .form-group select,
                .form-group textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    font-size: 1rem;
                }

                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #007bff;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .flexibility-options {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                }

                .flexibility-options h4 {
                    margin: 0 0 1rem 0;
                    color: #495057;
                }

                .flexible-time-range,
                .flexible-date-range {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e9ecef;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-primary {
                    background: #007bff;
                    color: white;
                }

                .btn-primary:hover {
                    background: #0056b3;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #545b62;
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .flexible-time-range,
                    .flexible-date-range {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .form-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </>
    );
};

export default WaitlistButton;
