const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');
const MedicalRecord = require('../models/medicalRecordModel');
const Prescription = require('../models/prescriptionModel');
const HealthMetrics = require('../models/healthMetricsModel');
const Notification = require('../models/notificationModel');

const MEDICAL_CONDITIONS = {
  'Hypertension': {
    diagnosis: 'Essential Hypertension',
    symptoms: ['High blood pressure', 'Headaches', 'Dizziness'],
    treatment: 'Lifestyle modifications and antihypertensive medication',
    prescriptions: [
      { medication: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
      { medication: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' }
    ],
    vitals: { systolic: 140, diastolic: 90 }
  },
  'Diabetes': {
    diagnosis: 'Type 2 Diabetes Mellitus',
    symptoms: ['Increased thirst', 'Frequent urination', 'Fatigue'],
    treatment: 'Diet control, exercise, and glucose monitoring',
    prescriptions: [
      { medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '90 days' },
      { medication: 'Glimepiride', dosage: '2mg', frequency: 'Once daily', duration: '90 days' }
    ],
    vitals: { glucose: 180 }
  },
  'Upper Respiratory Infection': {
    diagnosis: 'Viral Upper Respiratory Tract Infection',
    symptoms: ['Cough', 'Sore throat', 'Runny nose', 'Mild fever'],
    treatment: 'Supportive care and symptom management',
    prescriptions: [
      { medication: 'Acetaminophen', dosage: '500mg', frequency: 'Every 6 hours as needed', duration: '7 days' },
      { medication: 'Dextromethorphan', dosage: '15mg', frequency: 'Every 4 hours as needed', duration: '7 days' }
    ],
    vitals: { temperature: 99.2 }
  },
  'Anxiety': {
    diagnosis: 'Generalized Anxiety Disorder',
    symptoms: ['Excessive worry', 'Restlessness', 'Difficulty concentrating'],
    treatment: 'Cognitive behavioral therapy and medication management',
    prescriptions: [
      { medication: 'Sertraline', dosage: '50mg', frequency: 'Once daily', duration: '30 days' },
      { medication: 'Lorazepam', dosage: '0.5mg', frequency: 'As needed for anxiety', duration: '14 days' }
    ],
    vitals: { heartRate: 95 }
  },
  'Migraine': {
    diagnosis: 'Migraine without Aura',
    symptoms: ['Severe headache', 'Nausea', 'Light sensitivity'],
    treatment: 'Acute treatment and prevention strategies',
    prescriptions: [
      { medication: 'Sumatriptan', dosage: '50mg', frequency: 'As needed for migraine', duration: '30 days' },
      { medication: 'Propranolol', dosage: '40mg', frequency: 'Twice daily', duration: '90 days' }
    ],
    vitals: { bloodPressure: { systolic: 130, diastolic: 85 } }
  },
  'Back Pain': {
    diagnosis: 'Chronic Lower Back Pain',
    symptoms: ['Lower back pain', 'Muscle stiffness', 'Limited mobility'],
    treatment: 'Physical therapy, pain management, and ergonomic modifications',
    prescriptions: [
      { medication: 'Ibuprofen', dosage: '400mg', frequency: 'Three times daily', duration: '14 days' },
      { medication: 'Cyclobenzaprine', dosage: '10mg', frequency: 'At bedtime', duration: '14 days' }
    ],
    vitals: { painScale: 6 }
  }
};

const PREVENTIVE_CARE = {
  'Annual Physical': {
    diagnosis: 'Annual Health Maintenance',
    symptoms: ['Routine checkup'],
    treatment: 'Continue current health practices, update vaccinations',
    prescriptions: [
      { medication: 'Multivitamin', dosage: 'One tablet', frequency: 'Daily', duration: '365 days' }
    ],
    vitals: { normal: true }
  },
  'Wellness Visit': {
    diagnosis: 'Preventive Care Visit',
    symptoms: ['Health screening'],
    treatment: 'Health counseling and preventive measures',
    prescriptions: [],
    vitals: { normal: true }
  }
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateVitals(condition, baseVitals = {}) {
  let bpSys = typeof baseVitals.systolic === 'number' ? baseVitals.systolic : (120 + Math.floor(Math.random() * 30));
  let bpDia = typeof baseVitals.diastolic === 'number' ? baseVitals.diastolic : (80 + Math.floor(Math.random() * 20));
  let heartRate = typeof baseVitals.heartRate === 'number' ? baseVitals.heartRate : (70 + Math.floor(Math.random() * 30));
  let temperature = typeof baseVitals.temperature === 'number' ? baseVitals.temperature : (36.5 + (Math.random() * 1.5)); // Celsius
  const weight = 68 + Math.floor(Math.random() * 30); // kg
  const height = 160 + Math.floor(Math.random() * 30); // cm
  const oxygenSaturation = 97 + Math.floor(Math.random() * 3);
  if (condition.vitals) {
    if (typeof condition.vitals.systolic === 'number') bpSys = condition.vitals.systolic;
    if (typeof condition.vitals.diastolic === 'number') bpDia = condition.vitals.diastolic;
    if (condition.vitals.bloodPressure) {
      if (typeof condition.vitals.bloodPressure.systolic === 'number') bpSys = condition.vitals.bloodPressure.systolic;
      if (typeof condition.vitals.bloodPressure.diastolic === 'number') bpDia = condition.vitals.bloodPressure.diastolic;
    }
    if (typeof condition.vitals.heartRate === 'number') heartRate = condition.vitals.heartRate;
    if (typeof condition.vitals.temperature === 'number') temperature = condition.vitals.temperature;
  }

  if (typeof temperature === 'number' && temperature > 45) {
    temperature = Math.round(((temperature - 32) * 5 / 9) * 10) / 10;
  }

  return {
    bloodPressure: { systolic: bpSys, diastolic: bpDia },
    heartRate,
    temperature,
    weight,
    height,
    oxygenSaturation
  };
}

function buildMedicalRecordDoc(appointment, condition) {
  const isPreventive = condition === PREVENTIVE_CARE['Annual Physical'] || 
                      condition === PREVENTIVE_CARE['Wellness Visit'];
  const peGeneral = isPreventive ?
    'Well-appearing, alert and oriented. No acute distress.' :
    'Findings consistent with reported symptoms.';
  return {
    patientId: appointment.userId._id || appointment.userId,
    doctorId: appointment.doctorId._id || appointment.doctorId,
    appointmentId: appointment._id,
    visitDate: appointment.date,
    chiefComplaint: isPreventive ? 'Annual health maintenance visit' : (condition.symptoms || []).join(', ') || 'Follow-up visit',
    historyOfPresentIllness: isPreventive ? 
      'Routine annual physical examination and health maintenance.' :
      `Reports ${Array.isArray(condition.symptoms) ? condition.symptoms.join(', ') : 'symptoms'} for ${Math.floor(Math.random() * 14) + 1} days.`,
    physicalExamination: {
      general: peGeneral,
      head: '',
      neck: '',
      chest: '',
      abdomen: '',
      extremities: '',
      neurological: '',
      other: ''
    },
    socialHistory: {
      smoking: { status: 'never', details: '' },
      alcohol: { status: 'never', details: '' },
      drugs: { status: 'never', details: '' }
    },
    assessment: condition.treatment || 'Assessment and plan documented.',
    diagnosis: [{
      code: `Z${Math.floor(Math.random() * 90) + 10}.${Math.floor(Math.random() * 9)}`,
      description: condition.diagnosis || 'General assessment',
      type: 'primary'
    }],
    treatment: condition.treatment || 'Supportive care and follow-up as needed.',
    symptoms: appointment.symptoms || undefined
  };
}

function buildPrescriptionDoc(appointment, condition) {
  const meds = (condition.prescriptions || []).map(p => ({
    name: p.medication,
    dosage: p.dosage,
    frequency: p.frequency,
    duration: p.duration,
    instructions: `Take ${p.dosage} ${p.frequency}${p.duration ? ` for ${p.duration}` : ''}`
  }));
  return {
    doctorId: appointment.doctorId._id || appointment.doctorId,
    patientId: appointment.userId._id || appointment.userId,
    appointmentId: appointment._id,
    medications: meds.length > 0 ? meds : [{
      name: 'Multivitamin', dosage: '1 tablet', frequency: 'Daily', duration: '30 days', instructions: 'Take with food'
    }]
  };
}

async function createSampleMedicalRecords() {
  try {
    const clearExisting = process.argv.includes('--clear');
    console.log('🏥 Medical Record Creation Script');
    console.log('================================');
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    if (clearExisting) {
      const deletedCount = await MedicalRecord.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing medical records`);
    }
    const appointments = await Appointment.find({ 
      status: 'Completed' 
    }).populate('doctorId userId');
    if (appointments.length === 0) {
      console.log('❌ No completed appointments found');
      return;
    }
    console.log(`Found ${appointments.length} completed appointments`);
    const conditions = Object.values(MEDICAL_CONDITIONS);
    const preventiveCare = Object.values(PREVENTIVE_CARE);
    const allConditions = [...conditions, ...preventiveCare];

    let createdCount = 0;
    const diagnosisSummary = {};
    const pickConditionBySymptoms = (sym) => {
      if (!sym) return null;
      const s = sym.toLowerCase();
      if (s.includes('blood pressure') || s.includes('palpit') || s.includes('chest')) return 'Hypertension';
      if (s.includes('diab') || s.includes('glucose') || s.includes('thirst') || s.includes('urination')) return 'Diabetes';
      if (s.includes('sore throat') || s.includes('cough') || s.includes('runny nose') || s.includes('fever')) return 'Upper Respiratory Infection';
      if (s.includes('anxiety') || s.includes('depress') || s.includes('panic') || s.includes('insomnia')) return 'Anxiety';
      if (s.includes('migraine') || s.includes('headache') || s.includes('light sensitivity')) return 'Migraine';
      if (s.includes('back pain') || s.includes('stiffness') || s.includes('limited mobility')) return 'Back Pain';
      return null;
    };
    for (let appointment of appointments) {
      const existingRecord = await MedicalRecord.findOne({ appointmentId: appointment._id });
      if (existingRecord && !clearExisting) {
        console.log(`⏭️ Medical record already exists for appointment ${appointment._id}`);
        continue;
      }
      let selectedCondition;
      const mappedKey = pickConditionBySymptoms(appointment.symptoms);
      if (mappedKey && MEDICAL_CONDITIONS[mappedKey]) {
        selectedCondition = MEDICAL_CONDITIONS[mappedKey];
      } else if (appointment.symptoms) {
        const symptoms = appointment.symptoms.toLowerCase();
        selectedCondition = conditions.find(c => Array.isArray(c.symptoms) && c.symptoms.some(s => symptoms.includes(s.toLowerCase())))
          || getRandomElement(allConditions);
      } else {
        selectedCondition = Math.random() > 0.7 ? getRandomElement(preventiveCare) : getRandomElement(conditions);
      }
      const vitals = generateVitals(selectedCondition, selectedCondition.vitals || {});
      const metricsPayload = {
        userId: appointment.userId._id,
        weight: vitals.weight,
        height: vitals.height,
        bloodPressure: { systolic: vitals.bloodPressure.systolic, diastolic: vitals.bloodPressure.diastolic },
        heartRate: vitals.heartRate,
        temperature: { value: vitals.temperature, unit: 'celsius' },
        oxygenSaturation: vitals.oxygenSaturation,
        notes: 'Auto-generated metrics for completed appointment.'
      };
      const diagDesc = (selectedCondition && selectedCondition.diagnosis || '').toLowerCase();
      if (diagDesc.includes('diabetes')) {
        metricsPayload.bloodSugar = {
          value: 160 + Math.floor(Math.random() * 80), // 160-240 mg/dl
          testType: Math.random() > 0.5 ? 'random' : 'fasting',
          unit: 'mg/dl'
        };
      }
      const metricsDoc = await HealthMetrics.create(metricsPayload);
      const prescriptionDoc = await Prescription.create(buildPrescriptionDoc(appointment, selectedCondition));
      const medRecordPayload = buildMedicalRecordDoc(appointment, selectedCondition);
      medRecordPayload.healthMetricsIds = [metricsDoc._id];
      medRecordPayload.prescriptionIds = [prescriptionDoc._id];
      const medRecord = await MedicalRecord.create(medRecordPayload);
      await Appointment.updateOne({ _id: appointment._id }, { $set: { medicalRecordId: medRecord._id, prescriptionId: prescriptionDoc._id } });
      try {
        await Notification.create({
          userId: appointment.userId._id,
          content: `A new medical record has been added for your appointment on ${new Date(appointment.date).toLocaleDateString()}.`
        });
      } catch (_) {}

      createdCount += 1;
      const diag = medRecordPayload.diagnosis[0].description;
      diagnosisSummary[diag] = (diagnosisSummary[diag] || 0) + 1;
      console.log(`📋 Created record for ${appointment.userId.firstname} ${appointment.userId.lastname} - ${diag}`);
    }

    console.log(`✅ Created ${createdCount} medical records with linked prescriptions and health metrics`);
    if (createdCount > 0) {
      console.log('\n📊 Diagnosis Summary:');
      Object.entries(diagnosisSummary).forEach(([diagnosis, count]) => {
        console.log(`  ${diagnosis}: ${count}`);
      });
    }

    console.log('\n🎉 Medical records created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating medical records:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createSampleMedicalRecords();
