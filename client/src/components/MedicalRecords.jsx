import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/medicalrecords.css';

const MedicalRecords = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);

  const [recordData, setRecordData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    familyHistory: '',
    socialHistory: {
      smoking: { status: 'never', details: '' },
      alcohol: { status: 'never', details: '' },
      drugs: { status: 'never', details: '' }
    },
    allergies: [],
    currentMedications: [],
    vitalSigns: {
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: ''
    },
    physicalExamination: {
      general: '',
      head: '',
      neck: '',
      chest: '',
      abdomen: '',
      extremities: '',
      neurological: '',
      other: ''
    },
    assessment: '',
    diagnosis: [],
    treatment: '',
    prescriptions: [],
    labOrders: [],
    imagingOrders: [],
    followUp: {
      required: false,
      timeframe: '',
      instructions: ''
    },
    referrals: [],
    isConfidential: false
  });

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  const fetchCompletedAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/appointment/doctor?status=Completed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientRecords = async (patientId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/medical-record/patient/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPatientRecords(response.data.medicalRecords);
      }
    } catch (error) {
      console.error('Error fetching patient records:', error);
      toast.error('Failed to fetch patient records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRecordForm(true);
    
    // Pre-fill with appointment symptoms
    setRecordData(prev => ({
      ...prev,
      chiefComplaint: appointment.symptoms || ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      if (grandchild) {
        setRecordData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [grandchild]: type === 'checkbox' ? checked : value
            }
          }
        }));
      } else {
        setRecordData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === 'checkbox' ? checked : value
          }
        }));
      }
    } else {
      setRecordData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const addArrayItem = (arrayName, item) => {
    setRecordData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], item]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setRecordData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const recordPayload = {
        ...recordData,
        appointmentId: selectedAppointment._id,
        patientId: selectedAppointment.userId._id
      };
      
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/medical-record/create`,
        recordPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Medical record created successfully');
        setShowRecordForm(false);
        resetForm();
        fetchCompletedAppointments();
      }
    } catch (error) {
      console.error('Error creating medical record:', error);
      toast.error(error.response?.data?.message || 'Failed to create medical record');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecordData({
      chiefComplaint: '',
      historyOfPresentIllness: '',
      pastMedicalHistory: '',
      familyHistory: '',
      socialHistory: {
        smoking: { status: 'never', details: '' },
        alcohol: { status: 'never', details: '' },
        drugs: { status: 'never', details: '' }
      },
      allergies: [],
      currentMedications: [],
      vitalSigns: {
        bloodPressure: { systolic: '', diastolic: '' },
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: ''
      },
      physicalExamination: {
        general: '',
        head: '',
        neck: '',
        chest: '',
        abdomen: '',
        extremities: '',
        neurological: '',
        other: ''
      },
      assessment: '',
      diagnosis: [],
      treatment: '',
      prescriptions: [],
      labOrders: [],
      imagingOrders: [],
      followUp: {
        required: false,
        timeframe: '',
        instructions: ''
      },
      referrals: [],
      isConfidential: false
    });
    setSelectedAppointment(null);
  };

  const viewPatientHistory = (appointment) => {
    fetchPatientRecords(appointment.userId._id);
    setSelectedAppointment(appointment);
  };

  return (
    <div className="medical-records-container">
      <div className="page-header">
        <h2>Medical Records Management</h2>
        <p>Create and manage medical records for completed appointments</p>
      </div>

      {!showRecordForm && !viewingRecord && (
        <div className="appointments-section">
          <h3>Completed Appointments</h3>
          
          {loading && <div className="loading">Loading appointments...</div>}
          
          {appointments.length === 0 && !loading ? (
            <div className="empty-state">
              <p>No completed appointments found.</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map(appointment => (
                <div key={appointment._id} className="appointment-card">
                  <div className="patient-info">
                    <h4>{appointment.userId.firstname} {appointment.userId.lastname}</h4>
                    <p className="appointment-date">
                      {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                    </p>
                    <p className="symptoms">{appointment.symptoms}</p>
                  </div>
                  
                  <div className="card-actions">
                    {appointment.medicalRecordId ? (
                      <button 
                        className="btn-secondary"
                        onClick={() => setViewingRecord(appointment.medicalRecordId)}
                      >
                        View Record
                      </button>
                    ) : (
                      <button 
                        className="btn-primary"
                        onClick={() => handleCreateRecord(appointment)}
                      >
                        Create Record
                      </button>
                    )}
                    
                    <button 
                      className="btn-info"
                      onClick={() => viewPatientHistory(appointment)}
                    >
                      Patient History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRecordForm && (
        <div className="record-form-container">
          <div className="form-header">
            <h3>Create Medical Record</h3>
            <p>Patient: {selectedAppointment?.userId.firstname} {selectedAppointment?.userId.lastname}</p>
            <button 
              className="close-btn"
              onClick={() => {
                setShowRecordForm(false);
                resetForm();
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="medical-record-form">
            {/* Chief Complaint */}
            <div className="form-section">
              <h4>Chief Complaint</h4>
              <textarea
                name="chiefComplaint"
                value={recordData.chiefComplaint}
                onChange={handleInputChange}
                placeholder="Primary reason for the visit"
                required
                rows="3"
              />
            </div>

            {/* History */}
            <div className="form-section">
              <h4>History</h4>
              <div className="form-group">
                <label>History of Present Illness</label>
                <textarea
                  name="historyOfPresentIllness"
                  value={recordData.historyOfPresentIllness}
                  onChange={handleInputChange}
                  placeholder="Detailed description of current illness"
                  rows="4"
                />
              </div>
              
              <div className="form-group">
                <label>Past Medical History</label>
                <textarea
                  name="pastMedicalHistory"
                  value={recordData.pastMedicalHistory}
                  onChange={handleInputChange}
                  placeholder="Previous medical conditions, surgeries, hospitalizations"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Family History</label>
                <textarea
                  name="familyHistory"
                  value={recordData.familyHistory}
                  onChange={handleInputChange}
                  placeholder="Relevant family medical history"
                  rows="3"
                />
              </div>
            </div>

            {/* Vital Signs */}
            <div className="form-section">
              <h4>Vital Signs</h4>
              <div className="vitals-grid">
                <div className="form-group">
                  <label>Blood Pressure</label>
                  <div className="bp-inputs">
                    <input
                      type="number"
                      name="vitalSigns.bloodPressure.systolic"
                      value={recordData.vitalSigns.bloodPressure.systolic}
                      onChange={handleInputChange}
                      placeholder="Systolic"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      name="vitalSigns.bloodPressure.diastolic"
                      value={recordData.vitalSigns.bloodPressure.diastolic}
                      onChange={handleInputChange}
                      placeholder="Diastolic"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Heart Rate (bpm)</label>
                  <input
                    type="number"
                    name="vitalSigns.heartRate"
                    value={recordData.vitalSigns.heartRate}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="vitalSigns.temperature"
                    value={recordData.vitalSigns.temperature}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="vitalSigns.weight"
                    value={recordData.vitalSigns.weight}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    name="vitalSigns.height"
                    value={recordData.vitalSigns.height}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>O2 Saturation (%)</label>
                  <input
                    type="number"
                    name="vitalSigns.oxygenSaturation"
                    value={recordData.vitalSigns.oxygenSaturation}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Assessment and Treatment */}
            <div className="form-section">
              <h4>Assessment & Treatment</h4>
              <div className="form-group">
                <label>Assessment *</label>
                <textarea
                  name="assessment"
                  value={recordData.assessment}
                  onChange={handleInputChange}
                  placeholder="Clinical assessment and findings"
                  required
                  rows="4"
                />
              </div>
              
              <div className="form-group">
                <label>Treatment Plan</label>
                <textarea
                  name="treatment"
                  value={recordData.treatment}
                  onChange={handleInputChange}
                  placeholder="Treatment recommendations and plan"
                  rows="4"
                />
              </div>
            </div>

            {/* Follow-up */}
            <div className="form-section">
              <h4>Follow-up</h4>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="followUp.required"
                    checked={recordData.followUp.required}
                    onChange={handleInputChange}
                  />
                  Follow-up required
                </label>
              </div>
              
              {recordData.followUp.required && (
                <>
                  <div className="form-group">
                    <label>Follow-up Timeframe</label>
                    <input
                      type="text"
                      name="followUp.timeframe"
                      value={recordData.followUp.timeframe}
                      onChange={handleInputChange}
                      placeholder="e.g., 1 week, 2 weeks, 1 month"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Follow-up Instructions</label>
                    <textarea
                      name="followUp.instructions"
                      value={recordData.followUp.instructions}
                      onChange={handleInputChange}
                      placeholder="Instructions for follow-up visit"
                      rows="2"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRecordForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Medical Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {patientRecords.length > 0 && selectedAppointment && !showRecordForm && (
        <div className="patient-history">
          <div className="history-header">
            <h3>Medical History - {selectedAppointment.userId.firstname} {selectedAppointment.userId.lastname}</h3>
            <button 
              className="close-btn"
              onClick={() => {
                setPatientRecords([]);
                setSelectedAppointment(null);
              }}
            >
              ×
            </button>
          </div>
          
          <div className="records-timeline">
            {patientRecords.map(record => (
              <div key={record._id} className="record-item">
                <div className="record-date">
                  {new Date(record.visitDate).toLocaleDateString()}
                </div>
                <div className="record-content">
                  <h5>{record.chiefComplaint}</h5>
                  <p><strong>Assessment:</strong> {record.assessment}</p>
                  {record.treatment && <p><strong>Treatment:</strong> {record.treatment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
