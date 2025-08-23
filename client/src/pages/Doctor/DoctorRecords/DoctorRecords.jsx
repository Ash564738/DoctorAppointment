import React, { useState, useEffect } from 'react';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import './DoctorRecords.css';

const DoctorRecords = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewingRecordData, setViewingRecordData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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
    prescriptions: [
      { medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }
    ],
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
      const data = await apiCall.get(`/appointment/doctor`);
      if (data.success) {
        const completed = data.appointments.filter(a => a.status === 'Completed');
        setAppointments(completed);
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
      const data = await apiCall.get(`/medical-record/patient/${patientId}`);
      if (data.success) {
        setPatientRecords(data.medicalRecords);
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

  const handlePrescriptionChange = (index, field, value) => {
    const newPrescriptions = [...recordData.prescriptions];
    newPrescriptions[index][field] = value;
    setRecordData({ ...recordData, prescriptions: newPrescriptions });
  };

  const addPrescription = () => {
    setRecordData({
      ...recordData,
      prescriptions: [
        ...recordData.prescriptions,
        { medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }
      ]
    });
  };

  const removePrescription = (index) => {
    setRecordData({
      ...recordData,
      prescriptions: recordData.prescriptions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recordData.chiefComplaint || recordData.chiefComplaint.trim().length < 10) {
      toast.error('Chief complaint must be at least 10 characters.');
      return;
    }
    if (!recordData.assessment || recordData.assessment.trim().length < 10) {
      toast.error('Assessment must be at least 10 characters.');
      return;
    }

    const appointmentId =
      selectedAppointment?._id ||
      viewingRecordData?.appointmentId?._id ||
      viewingRecordData?.appointmentId;

    const patientId =
      selectedAppointment?.userId?._id ||
      viewingRecordData?.patientId?._id ||
      viewingRecordData?.patientId;

    if (!appointmentId) {
      toast.error('Appointment is missing or invalid.');
      return;
    }

    try {
      setLoading(true);
      const recordPayload = {
        ...recordData,
        appointmentId,
        patientId
      };
      let data;
      if (isEditing && viewingRecord) {
        data = await apiCall.put(`/medical-record/${viewingRecord}`, recordPayload);
      } else {
        data = await apiCall.post(`/medical-record/create`, recordPayload);
      }
      if (data.success) {
        toast.success(isEditing ? 'Medical record updated successfully' : 'Medical record created successfully');
        setShowRecordForm(false);
        setIsEditing(false);
        setViewingRecord(null);
        resetForm();
        fetchCompletedAppointments();
      }
    } catch (error) {
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        toast.error(error.response.data.errors.map(e => e.msg).join('\n'));
      } else {
        toast.error(error.response?.data?.message || 'Failed to create medical record');
      }
      console.error('Error creating medical record:', error);
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
      prescriptions: [
        { medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }
      ],
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

  const fetchMedicalRecordById = async (recordId) => {
    try {
      setLoading(true);
      const data = await apiCall.get(`/medical-record/${recordId}`);
      if (data.success) {
        setViewingRecordData(data.medicalRecord);
      } else {
        toast.error('Failed to fetch medical record');
        setViewingRecord(null);
      }
    } catch (error) {
      toast.error('Failed to fetch medical record');
      setViewingRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewingRecord) {
      fetchMedicalRecordById(viewingRecord);
    } else {
      setViewingRecordData(null);
    }
  }, [viewingRecord]);

  useEffect(() => {
    if (isEditing && viewingRecordData) {
      setRecordData({
        ...viewingRecordData,
        prescriptions: (viewingRecordData.prescriptions && viewingRecordData.prescriptions.length > 0)
          ? viewingRecordData.prescriptions.map(p => ({
              medication: p.medication || p.name || '',
              dosage: p.dosage || '',
              frequency: p.frequency || '',
              duration: p.duration || '',
              instructions: p.instructions || '',
              quantity: p.quantity || ''
            }))
          : [{ medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }]
      });
      setShowRecordForm(true);
    }
  }, [isEditing, viewingRecordData]);

  const handleEditRecord = () => {
    setIsEditing(true);
  };

  return (
    <div className="doctorRecords_page">
      <NavbarWrapper />
      <div className="doctorRecords_container">
        <div className="doctorRecords_header">
          <div className="doctorRecords_headerContent">
            <h2 className="doctorRecords_title">Medical Records Management</h2>
            <p className="doctorRecords_subtitle">Create and manage medical records for completed appointments</p>
          </div>
        </div>
        {!showRecordForm && !viewingRecord && (
          <div className="doctorRecords_appointmentsSection">
            <h3 className="doctorRecords_sectionTitle">Completed Appointments</h3>
            {loading && <div className="doctorRecords_loading">Loading appointments...</div>}
            {appointments.length === 0 && !loading ? (
              <div className="doctorRecords_emptyState">
                <p className="doctorRecords_emptyMessage">No completed appointments found.</p>
              </div>
            ) : (
              <div className="doctorRecords_appointmentsGrid">
                {appointments.map(appointment => (
                  <div key={appointment._id} className="doctorRecords_appointmentCard">
                    <div className="doctorRecords_patientInfo">
                      <h4 className="doctorRecords_patientName">{appointment.userId.firstname} {appointment.userId.lastname}</h4>
                      <p className="doctorRecords_appointmentDate">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                      <p className="doctorRecords_symptoms">{appointment.symptoms}</p>
                    </div>
                    <div className="doctorRecords_cardActions">
                      {appointment.medicalRecordId ? (
                        <button 
                          className="doctorRecords_actionButton doctorRecords_actionButton--secondary"
                          onClick={() => setViewingRecord(appointment.medicalRecordId)}
                          type="button"
                        >
                          View Record
                        </button>
                      ) : (
                        <button 
                          className="doctorRecords_actionButton doctorRecords_actionButton--primary"
                          onClick={() => handleCreateRecord(appointment)}
                          type="button"
                        >
                          Create Record
                        </button>
                      )}
                      <button 
                        className="doctorRecords_actionButton doctorRecords_actionButton--info"
                        onClick={() => viewPatientHistory(appointment)}
                        type="button"
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

        {viewingRecord && viewingRecordData && !showRecordForm && (
          <div className="doctorRecords_recordViewOverlay">
            <div className="doctorRecords_recordViewPopup">
              <div className="doctorRecords_formHeader">
                <h3 className="doctorRecords_formTitle">Medical Record</h3>
                <button 
                  className="doctorRecords_closeButton"
                  onClick={() => setViewingRecord(null)}
                  type="button"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="doctorRecords_recordDetails">
                <div className="doctorRecords_detailRow">
                  <strong>Patient:</strong> {viewingRecordData.patientId?.firstname} {viewingRecordData.patientId?.lastname}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Date:</strong> {viewingRecordData.visitDate ? new Date(viewingRecordData.visitDate).toLocaleDateString() : ''}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Chief Complaint:</strong> {viewingRecordData.chiefComplaint}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Diagnosis:</strong> {viewingRecordData.diagnosis && viewingRecordData.diagnosis.length > 0
                    ? viewingRecordData.diagnosis.map(d => d.description).join(', ')
                    : 'No diagnosis recorded'}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>History of Present Illness:</strong> {viewingRecordData.historyOfPresentIllness}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Past Medical History:</strong> {viewingRecordData.pastMedicalHistory}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Family History:</strong> {viewingRecordData.familyHistory}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Vital Signs:</strong>
                  <ul className="doctorRecords_vitalSignsList">
                    <li>Blood Pressure: {viewingRecordData.vitalSigns?.bloodPressure?.systolic}/{viewingRecordData.vitalSigns?.bloodPressure?.diastolic} mmHg</li>
                    <li>Heart Rate: {viewingRecordData.vitalSigns?.heartRate} bpm</li>
                    <li>Temperature: {viewingRecordData.vitalSigns?.temperature} °C</li>
                    <li>Weight: {viewingRecordData.vitalSigns?.weight} kg</li>
                    <li>Height: {viewingRecordData.vitalSigns?.height} cm</li>
                    <li>O2 Saturation: {viewingRecordData.vitalSigns?.oxygenSaturation} %</li>
                  </ul>
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Assessment:</strong> {viewingRecordData.assessment}
                </div>
                <div className="doctorRecords_detailRow">
                  <strong>Treatment:</strong> {viewingRecordData.treatment}
                </div>
                {viewingRecordData.prescriptions && viewingRecordData.prescriptions.length > 0 && (
                  <div className="doctorRecords_detailRow">
                    <strong>Prescriptions:</strong>
                    <ul className="doctorRecords_prescriptionsList">
                      {viewingRecordData.prescriptions.map((p, idx) => (
                        <li key={idx}>
                          {p.medication || p.name} {p.dosage && `- ${p.dosage}`} {p.frequency && `(${p.frequency})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {viewingRecordData.followUp?.required && (
                  <div className="doctorRecords_detailRow">
                    <strong>Follow-up:</strong> {viewingRecordData.followUp?.timeframe} - {viewingRecordData.followUp?.instructions}
                  </div>
                )}
              </div>
              <div className="doctorRecords_recordViewActions">
                <button
                  className="doctorRecords_actionButton doctorRecords_actionButton--primary"
                  onClick={handleEditRecord}
                  type="button"
                >
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        )}

        {showRecordForm && (
          <div className="doctorRecords_recordFormContainer">
            <div className="doctorRecords_formHeader">
              <h3 className="doctorRecords_formTitle">{isEditing ? 'Edit Medical Record' : 'Create Medical Record'}</h3>
              <p className="doctorRecords_formSubtitle">
                Patient: {selectedAppointment?.userId.firstname} {selectedAppointment?.userId.lastname}
              </p>
              <button 
                className="doctorRecords_closeButton"
                onClick={() => {
                  setShowRecordForm(false);
                  resetForm();
                }}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="doctorRecords_medicalRecordForm">
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Chief Complaint</h4>
                <textarea
                  className="doctorRecords_textarea"
                  name="chiefComplaint"
                  value={recordData.chiefComplaint}
                  onChange={handleInputChange}
                  placeholder="Primary reason for the visit"
                  required
                  rows="3"
                />
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">History</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">History of Present Illness</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="historyOfPresentIllness"
                    value={recordData.historyOfPresentIllness}
                    onChange={handleInputChange}
                    placeholder="Detailed description of current illness"
                    rows="4"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Past Medical History</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="pastMedicalHistory"
                    value={recordData.pastMedicalHistory}
                    onChange={handleInputChange}
                    placeholder="Previous medical conditions, surgeries, hospitalizations"
                    rows="3"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Family History</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="familyHistory"
                    value={recordData.familyHistory}
                    onChange={handleInputChange}
                    placeholder="Relevant family medical history"
                    rows="3"
                  />
                </div>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Vital Signs</h4>
                <div className="doctorRecords_vitalsGrid">
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Blood Pressure</label>
                    <div className="doctorRecords_bpInputs">
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.bloodPressure.systolic"
                        value={recordData.vitalSigns.bloodPressure.systolic}
                        onChange={handleInputChange}
                        placeholder="Systolic"
                      />
                      <span className="doctorRecords_bpSeparator">/</span>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.bloodPressure.diastolic"
                        value={recordData.vitalSigns.bloodPressure.diastolic}
                        onChange={handleInputChange}
                        placeholder="Diastolic"
                      />
                    </div>
                  </div>
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Heart Rate (bpm)</label>
                    <input
                      className="doctorRecords_input"
                      type="number"
                      name="vitalSigns.heartRate"
                      value={recordData.vitalSigns.heartRate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Temperature (°C)</label>
                    <input
                      className="doctorRecords_input"
                      type="number"
                      step="0.1"
                      name="vitalSigns.temperature"
                      value={recordData.vitalSigns.temperature}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Weight (kg)</label>
                    <input
                      className="doctorRecords_input"
                      type="number"
                      step="0.1"
                      name="vitalSigns.weight"
                      value={recordData.vitalSigns.weight}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Height (cm)</label>
                    <input
                      className="doctorRecords_input"
                      type="number"
                      name="vitalSigns.height"
                      value={recordData.vitalSigns.height}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">O2 Saturation (%)</label>
                    <input
                      className="doctorRecords_input"
                      type="number"
                      name="vitalSigns.oxygenSaturation"
                      value={recordData.vitalSigns.oxygenSaturation}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Assessment & Treatment</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Assessment *</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="assessment"
                    value={recordData.assessment}
                    onChange={handleInputChange}
                    placeholder="Clinical assessment and findings"
                    required
                    rows="4"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Treatment Plan</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="treatment"
                    value={recordData.treatment}
                    onChange={handleInputChange}
                    placeholder="Treatment recommendations and plan"
                    rows="4"
                  />
                </div>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Prescriptions</h4>
                <p className="doctorRecords_prescriptionsNote">
                  (Optional) Add one or more prescriptions for this visit. Leave empty if not needed.
                </p>
                {recordData.prescriptions.map((presc, idx) => (
                  <div key={idx} className="doctorRecords_prescriptionCard">
                    <div className="doctorRecords_prescriptionHeader">
                      <span className="doctorRecords_prescriptionTitle">Prescription {idx+1}</span>
                      {recordData.prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrescription(idx)}
                          className="doctorRecords_removePrescriptionBtn"
                          aria-label="Remove prescription"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="doctorRecords_prescriptionFields">
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Medication name"
                        value={presc.medication}
                        onChange={e => handlePrescriptionChange(idx, 'medication', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Dosage"
                        value={presc.dosage}
                        onChange={e => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Frequency"
                        value={presc.frequency}
                        onChange={e => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Duration"
                        value={presc.duration}
                        onChange={e => handlePrescriptionChange(idx, 'duration', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Quantity"
                        value={presc.quantity}
                        onChange={e => handlePrescriptionChange(idx, 'quantity', e.target.value)}
                        required={false}
                      />
                      <textarea
                        className="doctorRecords_textarea"
                        placeholder="Instructions"
                        value={presc.instructions}
                        onChange={e => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPrescription}
                  className="doctorRecords_addPrescriptionBtn"
                >
                  Add Another Prescription
                </button>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Follow-up</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
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
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Follow-up Timeframe</label>
                      <input
                        className="doctorRecords_input"
                        type="text"
                        name="followUp.timeframe"
                        value={recordData.followUp.timeframe}
                        onChange={handleInputChange}
                        placeholder="e.g., 1 week, 2 weeks, 1 month"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Follow-up Instructions</label>
                      <textarea
                        className="doctorRecords_textarea"
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
              <div className="doctorRecords_formActions">                
                <button
                  type="submit"
                  className="doctorRecords_actionButton doctorRecords_actionButton--primary"
                  disabled={loading}
                >
                  {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Medical Record')}
                </button>
              </div>
            </form>
          </div>
        )}

        {patientRecords.length > 0 && selectedAppointment && !showRecordForm && !viewingRecord && (
          <div className="doctorRecords_patientHistory">
            <div className="doctorRecords_historyHeader">
              <h3 className="doctorRecords_historyTitle">Medical History - {selectedAppointment.userId.firstname} {selectedAppointment.userId.lastname}</h3>
              <button 
                className="doctorRecords_closeButton"
                onClick={() => {
                  setPatientRecords([]);
                  setSelectedAppointment(null);
                }}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="doctorRecords_recordsTimeline">
              {patientRecords.map(record => (
                <div key={record._id} className="doctorRecords_recordItem">
                  <div className="doctorRecords_recordDate">
                    {new Date(record.visitDate).toLocaleDateString()}
                  </div>
                  <div className="doctorRecords_recordContent">
                    <h5 className="doctorRecords_recordTitle">{record.chiefComplaint}</h5>
                    <p className="doctorRecords_recordDetail"><strong>Assessment:</strong> {record.assessment}</p>
                    {record.treatment && <p className="doctorRecords_recordDetail"><strong>Treatment:</strong> {record.treatment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
};

export default DoctorRecords;