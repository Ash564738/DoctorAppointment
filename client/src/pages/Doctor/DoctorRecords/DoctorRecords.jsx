import React, { useState, useEffect } from 'react';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import MedicalRecordForm from './MedicalRecordForm';
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
    symptoms: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    skipFamilyHistory: false,
    familyHistory: '',
    socialHistory: {
      smoking: { status: 'never', details: '' },
      alcohol: { status: 'never', details: '' },
      drugs: { status: 'never', details: '' }
    },
    skipAllergies: false,
    allergies: [{ allergen: '', reaction: '', severity: '' }],
    skipPhysicalExamination: false,
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
    diagnosis: [{ code: '', description: '', type: '' }],
    treatment: '',
    skipVitalSigns: false,
    vitalSigns: {
      bloodPressure: { systolic: '', diastolic: '', formatted: '' },
      heartRate: '',
      temperature: { value: '', unit: 'celsius' },
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      bloodSugar: { value: '', testType: '', unit: 'mg/dl' }
    },
    prescriptions: [
      { medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '', symptoms: '' }
    ],
    followUp: {
      required: false,
      timeframe: '',
      instructions: ''
    },
    attachments: []
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
              ...(prev[parent] && prev[parent][child] ? prev[parent][child] : {}),
              [grandchild]:
                (parent === 'vitalSigns' && ['weight', 'height', 'heartRate', 'respiratoryRate', 'oxygenSaturation'].includes(child)) || 
                (parent === 'vitalSigns' && child === 'temperature' && grandchild === 'value') || 
                (parent === 'vitalSigns' && child === 'bloodPressure' && (grandchild === 'systolic' || grandchild === 'diastolic')) 
                  ? value === '' ? '' : isNaN(Number(value)) ? value : Number(value)
                  : (type === 'checkbox' ? checked : value)
            }
          }
        }));
      } else {
        setRecordData(prev => ({
          ...prev,
          [parent]: {
            ...(prev[parent] ? prev[parent] : {}),
            [child]:
              (parent === 'vitalSigns' && ['weight', 'height', 'heartRate', 'respiratoryRate', 'oxygenSaturation'].includes(child)) 
                ? value === '' ? '' : isNaN(Number(value)) ? value : Number(value)
                : (type === 'checkbox' ? checked : value)
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
    if (!recordData.symptoms || recordData.symptoms.trim().length < 3) {
      toast.error('Symptoms are required and must be at least 3 characters.');
      return;
    }
    if (!recordData.assessment || recordData.assessment.trim().length < 10) {
      toast.error('Assessment must be at least 10 characters.');
      return;
    }
    const appointmentId = selectedAppointment?._id || viewingRecordData?.appointmentId?._id || viewingRecordData?.appointmentId;
    const patientId = selectedAppointment?.userId?._id || viewingRecordData?.patientId?._id || viewingRecordData?.patientId;
    if (!appointmentId) {
      toast.error('Appointment is missing or invalid.');
      return;
    }
    setLoading(true);
    let createdPrescriptionIds = [];
    let createdHealthMetricsIds = [];
    let createdPrescriptionApiIds = [];
    let createdHealthMetricsApiIds = [];
    try {
      if (!recordData.prescriptions || recordData.prescriptions.length === 0 || !recordData.prescriptions[0].medication) {
        toast.error('Please add at least one prescription with medication name.');
        setLoading(false);
        return;
      }
      for (const presc of recordData.prescriptions) {
        if (!presc.medication || !presc.dosage || !presc.frequency) {
          toast.error('Please fill in all prescription fields (medication, dosage, frequency).');
          setLoading(false);
          return;
        }
        let symptoms = (recordData.symptoms || '').trim();
        if (!symptoms) symptoms = (recordData.chiefComplaint || '').trim();
        if (!symptoms) symptoms = 'N/A';
        let diagnosis = '';
        if (Array.isArray(recordData.diagnosis) && recordData.diagnosis.length > 0 && recordData.diagnosis[0].description) {
          diagnosis = recordData.diagnosis[0].description.trim();
        } else if (typeof recordData.diagnosis === 'string') {
          diagnosis = recordData.diagnosis.trim();
        }
        if (!diagnosis || diagnosis.length === 0) {
          toast.error('Diagnosis is required and must be under 500 characters.');
          setLoading(false);
          return;
        }
        if (diagnosis.length > 500) {
          toast.error('Diagnosis must be under 500 characters.');
          setLoading(false);
          return;
        }
        const prescPayload = {
          patientId,
          appointmentId,
          medications: [{
            name: presc.medication,
            dosage: presc.dosage,
            frequency: presc.frequency,
            duration: presc.duration,
            instructions: presc.instructions,
            quantity: presc.quantity
          }],
          symptoms,
          diagnosis
        };
        let prescRes;
        try {
          if (presc._id) {
            prescRes = await apiCall.put(`/prescription/${presc._id}`, prescPayload);
          } else {
            prescRes = await apiCall.post('/prescription/create', prescPayload);
          }
          if (prescRes.success && prescRes.data && prescRes.data._id) {
            createdPrescriptionIds.push(prescRes.data._id);
            createdPrescriptionApiIds.push(prescRes.data._id);
          } else {
            throw new Error('Prescription creation failed');
          }
        } catch (err) {
          for (const id of createdPrescriptionApiIds) {
            try { await apiCall.post(`/prescription/${id}/delete`); } catch {}
          }
          setLoading(false);
          toast.error('Failed to create prescription. All created prescriptions have been rolled back.');
          return;
        }
      }
      const vitals = recordData.vitalSigns || {};
      const isEmpty = val => val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
      if (!recordData.skipVitalSigns) {
        if (
          isEmpty(vitals.weight) ||
          isEmpty(vitals.height) ||
          isEmpty(vitals.temperature?.value) ||
          isEmpty(vitals.bloodPressure?.systolic) ||
          isEmpty(vitals.bloodPressure?.diastolic)
        ) {
          for (const id of createdPrescriptionApiIds) {
            try { await apiCall.post(`/prescription/${id}/delete`); } catch {}
          }
          toast.error('Please fill in all required health metric fields (weight, height, temperature, blood pressure).');
          setLoading(false);
          return;
        }
      }
      const validTestTypes = ['fasting', 'random', 'postprandial'];
      const validUnits = ['mg/dl', 'mmol/l'];
      const cleanBloodSugar = {};
      if (vitals.bloodSugar) {
        if (vitals.bloodSugar.value !== undefined && vitals.bloodSugar.value !== '') cleanBloodSugar.value = vitals.bloodSugar.value;
        if (validTestTypes.includes(vitals.bloodSugar.testType)) cleanBloodSugar.testType = vitals.bloodSugar.testType;
        if (validUnits.includes(vitals.bloodSugar.unit)) cleanBloodSugar.unit = vitals.bloodSugar.unit;
      }
      let healthMetricsRes;
      try {
        let metricsPayload = {
          userId: patientId,
          weight: vitals.weight,
          height: vitals.height,
          bloodPressure: {
            systolic: vitals.bloodPressure?.systolic,
            diastolic: vitals.bloodPressure?.diastolic,
            formatted: vitals.bloodPressure?.formatted || (vitals.bloodPressure?.systolic && vitals.bloodPressure?.diastolic ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : undefined)
          },
          heartRate: vitals.heartRate,
          temperature: {
            value: vitals.temperature?.value || vitals.temperature,
            unit: vitals.temperature?.unit || 'celsius'
          },
          bloodSugar: Object.keys(cleanBloodSugar).length > 0 ? cleanBloodSugar : undefined,
          oxygenSaturation: vitals.oxygenSaturation,
          respiratoryRate: vitals.respiratoryRate,
          notes: recordData.treatment || ''
        };
        healthMetricsRes = await apiCall.post('/health-metrics/create', metricsPayload);
        if (healthMetricsRes.success && healthMetricsRes.data && healthMetricsRes.data._id) {
          createdHealthMetricsIds.push(healthMetricsRes.data._id);
          createdHealthMetricsApiIds.push(healthMetricsRes.data._id);
        } else {
          throw new Error('Health metrics creation failed');
        }
      } catch (err) {
        for (const id of createdPrescriptionApiIds) {
          try { await apiCall.post(`/prescription/${id}/delete`); } catch {}
        }
        setLoading(false);
        toast.error('Failed to create health metrics. All created prescriptions have been rolled back.');
        return;
      }
      let fixedDiagnosis = [];
      if (Array.isArray(recordData.diagnosis)) {
        fixedDiagnosis = recordData.diagnosis.filter(d => d && (d.description || d.text)).map(d => ({
          ...(d.code ? { code: d.code } : {}),
          ...(d.type ? { type: d.type } : {}),
          description: d.description || d.text || ''
        }));
      } else if (typeof recordData.diagnosis === 'string' && recordData.diagnosis.trim()) {
        fixedDiagnosis = [{ description: recordData.diagnosis.trim() }];
      }
      const validSeverities = ['mild', 'moderate', 'severe'];
      let fixedAllergies = Array.isArray(recordData.allergies)
        ? recordData.allergies.filter(a => a && a.allergen && a.reaction && validSeverities.includes(a.severity))
        : [];
      const recordPayload = {
        ...recordData,
        diagnosis: fixedDiagnosis,
        allergies: fixedAllergies,
        symptoms: recordData.symptoms || recordData.chiefComplaint || '',
        appointmentId,
        patientId,
        prescriptionIds: createdPrescriptionIds,
        healthMetricsIds: createdHealthMetricsIds
      };
      let data;
      try {
        if (isEditing && viewingRecord) {
          data = await apiCall.put(`/medical-record/${viewingRecord}`, recordPayload);
        } else {
          data = await apiCall.post(`/medical-record/create`, recordPayload);
        }
        if (!data.success) throw new Error('Medical record creation failed');
      } catch (err) {
        for (const id of createdPrescriptionApiIds) {
          try { await apiCall.post(`/prescription/${id}/delete`); } catch {}
        }
        for (const id of createdHealthMetricsApiIds) {
          try { await apiCall.post(`/health-metrics/${id}/delete`); } catch {}
        }
        setLoading(false);
        toast.error('Failed to create medical record. All created prescriptions and health metrics have been rolled back.');
        return;
      }
      toast.success(isEditing ? 'Medical record updated successfully' : 'Medical record created successfully');
      setShowRecordForm(false);
      setIsEditing(false);
      setViewingRecord(null);
      resetForm();
      fetchCompletedAppointments();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecordData({
      chiefComplaint: '',
      symptoms: '',
      historyOfPresentIllness: '',
      pastMedicalHistory: '',
      familyHistory: '',
      socialHistory: {
        smoking: { status: 'never', details: '' },
        alcohol: { status: 'never', details: '' },
        drugs: { status: 'never', details: '' }
      },
      allergies: [{ allergen: '', reaction: '', severity: '' }],
      vitalSigns: {
        bloodPressure: { systolic: '', diastolic: '', formatted: '' },
        heartRate: '',
        temperature: { value: '', unit: 'celsius' },
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
        bloodSugar: { value: '', testType: '', unit: 'mg/dl' }
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
      diagnosis: [{ code: '', description: '', type: '' }],
      treatment: '',
      prescriptions: [
        { medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }
      ],
      followUp: {
        required: false,
        timeframe: '',
        instructions: ''
      },
      attachments: []
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
      const prescriptions = (viewingRecordData.prescriptionIds && viewingRecordData.prescriptionIds.length > 0)
        ? viewingRecordData.prescriptionIds.map(p => {
            const med = Array.isArray(p.medications) && p.medications.length > 0 ? p.medications[0] : {};
            return {
              _id: p._id,
              medication: med.name || '',
              dosage: med.dosage || '',
              frequency: med.frequency || '',
              duration: med.duration || '',
              instructions: med.instructions || p.instructions || '',
              quantity: med.quantity || '',
              isUrgent: p.isUrgent || false
            };
          })
        : [{ medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '', isUrgent: false }];
      let vitalSigns = {
        bloodPressure: { systolic: '', diastolic: '', formatted: '' },
        heartRate: '',
        temperature: { value: '', unit: 'celsius' },
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
        bloodSugar: { value: '', testType: '', unit: 'mg/dl' }
      };
      if (viewingRecordData.healthMetricsIds && viewingRecordData.healthMetricsIds.length > 0) {
        const latestMetric = viewingRecordData.healthMetricsIds[viewingRecordData.healthMetricsIds.length - 1];
        vitalSigns = {
          bloodPressure: latestMetric.bloodPressure || { systolic: '', diastolic: '', formatted: '' },
          heartRate: latestMetric.heartRate || '',
          temperature: latestMetric.temperature || { value: '', unit: 'celsius' },
          respiratoryRate: latestMetric.respiratoryRate || '',
          oxygenSaturation: latestMetric.oxygenSaturation || '',
          weight: latestMetric.weight || '',
          height: latestMetric.height || '',
          bloodSugar: latestMetric.bloodSugar || { value: '', testType: '', unit: 'mg/dl' }
        };
      }

      setRecordData(prev => ({
        ...prev,
        chiefComplaint: viewingRecordData.chiefComplaint || '',
        symptoms: viewingRecordData.symptoms || '',
        historyOfPresentIllness: viewingRecordData.historyOfPresentIllness || '',
        pastMedicalHistory: viewingRecordData.pastMedicalHistory || '',
        familyHistory: viewingRecordData.familyHistory || '',
        socialHistory: viewingRecordData.socialHistory || prev.socialHistory,
        allergies: viewingRecordData.allergies || [],
        currentMedications: viewingRecordData.currentMedications || [],
        vitalSigns,
        physicalExamination: viewingRecordData.physicalExamination || prev.physicalExamination,
        assessment: viewingRecordData.assessment || '',
        diagnosis: viewingRecordData.diagnosis || [],
        treatment: viewingRecordData.treatment || '',
        prescriptions,
        labOrders: viewingRecordData.labOrders || [],
        imagingOrders: viewingRecordData.imagingOrders || [],
        followUp: viewingRecordData.followUp || prev.followUp,
        referrals: viewingRecordData.referrals || [],
        isConfidential: viewingRecordData.isConfidential || false
      }));
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

        {viewingRecord && viewingRecordData && !showRecordForm && (() => {
          const symptoms = viewingRecordData.symptoms || viewingRecordData.chiefComplaint || '';
          const prescriptions = (viewingRecordData.prescriptionIds && viewingRecordData.prescriptionIds.length > 0)
            ? viewingRecordData.prescriptionIds.map(p => {
                const med = Array.isArray(p.medications) && p.medications.length > 0 ? p.medications[0] : {};
                return {
                  _id: p._id,
                  medication: med.name || '',
                  dosage: med.dosage || '',
                  frequency: med.frequency || '',
                  duration: med.duration || '',
                  instructions: med.instructions || p.instructions || '',
                  quantity: med.quantity || '',
                  symptoms: symptoms || '',
                  isUrgent: p.isUrgent || false
                };
              })
            : [{ medication: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '', symptoms: symptoms || '', isUrgent: false }];

          let vitalSigns = {
            bloodPressure: { systolic: '', diastolic: '', formatted: '' },
            heartRate: '',
            temperature: { value: '', unit: 'celsius' },
            respiratoryRate: '',
            oxygenSaturation: '',
            weight: '',
            height: '',
            bloodSugar: { value: '', testType: '', unit: 'mg/dl' },
            notes: ''
          };
          if (viewingRecordData.healthMetricsIds && viewingRecordData.healthMetricsIds.length > 0) {
            const latestMetric = viewingRecordData.healthMetricsIds[viewingRecordData.healthMetricsIds.length - 1];
            vitalSigns = {
              bloodPressure: latestMetric.bloodPressure || { systolic: '', diastolic: '', formatted: '' },
              heartRate: latestMetric.heartRate || '',
              temperature: latestMetric.temperature || { value: '', unit: 'celsius' },
              respiratoryRate: latestMetric.respiratoryRate || '',
              oxygenSaturation: latestMetric.oxygenSaturation || '',
              weight: latestMetric.weight || '',
              height: latestMetric.height || '',
              bloodSugar: latestMetric.bloodSugar || { value: '', testType: '', unit: 'mg/dl' },
              notes: latestMetric.notes || ''
            };
          }

          const normalizedRecord = {
            chiefComplaint: viewingRecordData.chiefComplaint || '',
            symptoms,
            historyOfPresentIllness: viewingRecordData.historyOfPresentIllness || '',
            pastMedicalHistory: viewingRecordData.pastMedicalHistory || '',
            familyHistory: viewingRecordData.familyHistory || '',
            socialHistory: viewingRecordData.socialHistory || {},
            allergies: viewingRecordData.allergies || [],
            vitalSigns,
            physicalExamination: viewingRecordData.physicalExamination || {},
            assessment: viewingRecordData.assessment || '',
            diagnosis: viewingRecordData.diagnosis || [],
            treatment: viewingRecordData.treatment || '',
            prescriptions,
            followUp: viewingRecordData.followUp || {},
          };
          return (
            <div className="doctorRecords_recordFormContainer">
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
              <MedicalRecordForm
                recordData={normalizedRecord}
                readOnly={true}
              />
              <div className="doctorRecords_formActions">
                <button
                  className="doctorRecords_actionButton doctorRecords_actionButton--primary"
                  onClick={handleEditRecord}
                  type="button"
                >
                  Edit Record
                </button>
              </div>
            </div>
          );
        })()}

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
            <MedicalRecordForm
              recordData={recordData}
              onInputChange={handleInputChange}
              onPrescriptionChange={handlePrescriptionChange}
              addPrescription={addPrescription}
              removePrescription={removePrescription}
              addArrayItem={addArrayItem}
              removeArrayItem={removeArrayItem}
              loading={loading}
              isEditing={isEditing}
              handleSubmit={handleSubmit}
              readOnly={false}
            />
            <div className="doctorRecords_formActions">                
              <button
                type="submit"
                className="doctorRecords_actionButton doctorRecords_actionButton--primary"
                form="doctorRecords_medicalRecordForm"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Medical Record')}
              </button>
            </div>
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