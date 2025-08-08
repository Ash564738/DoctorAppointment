import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/shiftmanagement.css';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    maxPatientsPerHour: 4,
    slotDuration: 30,
    department: 'General',
    specialNotes: '',
    breakTime: {
      start: '',
      end: ''
    }
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/doctor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setShifts(response.data.shifts);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'daysOfWeek') {
      const newDays = checked 
        ? [...formData.daysOfWeek, value]
        : formData.daysOfWeek.filter(day => day !== value);
      setFormData({ ...formData, daysOfWeek: newDays });
    } else if (name.includes('breakTime.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        breakTime: { ...formData.breakTime, [field]: value }
      });
    } else {
      setFormData({ ...formData, [name]: type === 'number' ? parseInt(value) : value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (editingShift) {
        await axios.put(`${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/${editingShift._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Shift updated successfully');
      } else {
        await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/create`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Shift created successfully');
      }
      
      resetForm();
      fetchShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error(error.response?.data?.message || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      title: shift.title,
      startTime: shift.startTime,
      endTime: shift.endTime,
      daysOfWeek: shift.daysOfWeek,
      maxPatientsPerHour: shift.maxPatientsPerHour,
      slotDuration: shift.slotDuration,
      department: shift.department,
      specialNotes: shift.specialNotes || '',
      breakTime: shift.breakTime || { start: '', end: '' }
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (shiftId) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = async (date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/generate-slots`, 
        { date }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setTimeSlots(response.data.slots);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Error generating slots:', error);
      toast.error('Failed to generate time slots');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      maxPatientsPerHour: 4,
      slotDuration: 30,
      department: 'General',
      specialNotes: '',
      breakTime: { start: '', end: '' }
    });
    setEditingShift(null);
    setShowCreateForm(false);
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const departments = ['General', 'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Emergency'];

  return (
    <div className="shift-management">
      <div className="shift-header">
        <h2>Shift Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
          disabled={loading}
        >
          Create New Shift
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="shift-form-modal">
            <div className="modal-header">
              <h3>{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="shift-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shift Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Morning Shift"
                  />
                </div>
                
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Patients Per Hour</label>
                  <input
                    type="number"
                    name="maxPatientsPerHour"
                    value={formData.maxPatientsPerHour}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                  />
                </div>
                
                <div className="form-group">
                  <label>Slot Duration (minutes)</label>
                  <select
                    name="slotDuration"
                    value={formData.slotDuration}
                    onChange={handleInputChange}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Working Days *</label>
                <div className="days-checkbox-group">
                  {weekDays.map(day => (
                    <label key={day} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="daysOfWeek"
                        value={day}
                        checked={formData.daysOfWeek.includes(day)}
                        onChange={handleInputChange}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Break Start Time</label>
                  <input
                    type="time"
                    name="breakTime.start"
                    value={formData.breakTime.start}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Break End Time</label>
                  <input
                    type="time"
                    name="breakTime.end"
                    value={formData.breakTime.end}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Special Notes</label>
                <textarea
                  name="specialNotes"
                  value={formData.specialNotes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions or notes about this shift"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingShift ? 'Update Shift' : 'Create Shift')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="shifts-section">
        <h3>Your Shifts</h3>
        {loading && <div className="loading">Loading shifts...</div>}
        
        {shifts.length === 0 && !loading ? (
          <div className="empty-state">
            <p>No shifts created yet. Create your first shift to start managing your schedule.</p>
          </div>
        ) : (
          <div className="shifts-grid">
            {shifts.map(shift => (
              <div key={shift._id} className="shift-card">
                <div className="shift-header">
                  <h4>{shift.title}</h4>
                  <span className="department-badge">{shift.department}</span>
                </div>
                
                <div className="shift-details">
                  <p><strong>Time:</strong> {shift.startTime} - {shift.endTime}</p>
                  <p><strong>Days:</strong> {shift.daysOfWeek.join(', ')}</p>
                  <p><strong>Capacity:</strong> {shift.maxPatientsPerHour} patients/hour</p>
                  <p><strong>Slot Duration:</strong> {shift.slotDuration} minutes</p>
                  
                  {shift.breakTime && shift.breakTime.start && (
                    <p><strong>Break:</strong> {shift.breakTime.start} - {shift.breakTime.end}</p>
                  )}
                  
                  {shift.specialNotes && (
                    <p><strong>Notes:</strong> {shift.specialNotes}</p>
                  )}
                </div>
                
                <div className="shift-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleEdit(shift)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger" 
                    onClick={() => handleDelete(shift._id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="slot-generation-section">
        <h3>Generate Time Slots</h3>
        <div className="slot-generation-form">
          <div className="form-group">
            <label>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button 
            className="btn-primary"
            onClick={() => generateTimeSlots(selectedDate)}
            disabled={loading || !selectedDate}
          >
            Generate Slots for {selectedDate}
          </button>
        </div>
        
        {timeSlots.length > 0 && (
          <div className="generated-slots">
            <h4>Generated Time Slots ({timeSlots.length} slots)</h4>
            <div className="slots-grid">
              {timeSlots.map((slot, index) => (
                <div key={index} className="slot-item">
                  <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
                  <span className="slot-capacity">{slot.maxPatients} patients max</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
