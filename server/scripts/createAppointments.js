const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Appointment = require('../models/appointmentModel');
const Shift = require('../models/shiftModel');
const Payment = require('../models/paymentModel');
const LeaveRequest = require('../models/leaveRequestModel');
const TimeSlot = require('../models/timeSlotModel');

const APPOINTMENT_TYPES = [
  'Consultation',
  'Follow-up',
  'Emergency',
  'Routine Checkup',
  'Specialist Referral',
  'Diagnostic',
  'Treatment',
  'Preventive Care'
];

const SYMPTOMS_BY_SPECIALIZATION = {
  Cardiology: [
    'Chest pain', 'Shortness of breath', 'Heart palpitations', 'Dizziness on exertion', 'Leg swelling',
    'High blood pressure monitoring', 'Irregular heartbeat', 'Fainting spells (syncope)', 'Chest tightness with activity', 'Rapid heartbeat',
    'Fatigue with minimal exertion', 'Blue discoloration of lips (cyanosis)', 'Orthopnea (shortness of breath when lying down)', 'Paroxysmal nocturnal dyspnea', 'Exercise intolerance',
    'Family history of early heart disease', 'Elevated cholesterol follow-up', 'Edema in ankles', 'Pounding heartbeat at night', 'Non-specific chest discomfort'
  ],
  Neurology: [
    'Chronic headaches', 'Migraines with aura', 'Memory loss', 'Confusion episodes', 'Seizure episodes',
    'Numbness and tingling', 'Muscle weakness', 'Tremors', 'Dizziness and balance issues', 'Blurred vision with headache',
    'Speech difficulties', 'Pins and needles sensation', 'Unsteady gait', 'Facial droop', 'Light sensitivity',
    'Neck stiffness with headache', 'Carpal tunnel symptoms', 'Peripheral neuropathy symptoms', 'Restless legs', 'Sleep disturbances'
  ],
  Pediatrics: [
    'Fever in child', 'Cold and cough symptoms', 'Vaccination consultation', 'Poor appetite', 'Vomiting and diarrhea',
    'Rash in child', 'Ear pain', 'Sore throat', 'Wheezing in child', 'Growth and development check',
    'Behavioral concerns', 'Allergic reactions', 'Abdominal pain in child', 'Night sweats', 'Bedwetting',
    'Recurrent infections', 'Constipation in child', 'Anemia screening', 'School physical', 'Sports clearance'
  ],
  Orthopedics: [
    'Joint pain and stiffness', 'Knee pain climbing stairs', 'Shoulder pain with overhead activity', 'Ankle sprain', 'Back pain and limited mobility',
    'Neck pain', 'Hip pain', 'Wrist pain after fall', 'Tennis elbow', 'Carpal tunnel symptoms',
    'Fracture follow-up', 'Arthritis management', 'Morning stiffness', 'Swollen joints', 'Foot arch pain',
    'Sciatica', 'Muscle strains', 'Bursitis', 'Tendonitis', 'Post-operative orthopedic follow-up'
  ],
  Dermatology: [
    'Itchy skin rash', 'Eczema flare', 'Psoriasis plaques', 'Acne with scarring', 'Rosacea redness',
    'Hives (urticaria)', 'Mole change in size or color', 'Hair loss', 'Dandruff (seborrheic dermatitis)', 'Skin infection with pus',
    'Fungal infection between toes', 'Nail fungus', 'Contact dermatitis', 'Sunburn', 'Hyperpigmentation',
    'Melasma', 'Wart on finger', 'Cold sores', 'Dry skin and cracking', 'Skin cancer screening'
  ],
  Psychiatry: [
    'Anxiety and excessive worry', 'Depressed mood', 'Panic attacks', 'Insomnia and early awakening', 'Irritability and agitation',
    'Loss of interest and pleasure', 'Concentration difficulties', 'Appetite changes', 'Obsessive thoughts', 'Compulsive behaviors',
    'Social anxiety', 'Post-traumatic stress symptoms', 'Bipolar mood swings', 'Fatigue and low energy', 'Restlessness',
    'Feelings of guilt or worthlessness', 'Suicidal ideation (screening)', 'Stress management consultation', 'Medication review', 'Therapy session request'
  ],
  Emergency: [
    'Severe abdominal pain', 'Difficulty breathing', 'Crushing chest pain', 'High fever and chills', 'Severe allergic reaction with swelling',
    'Loss of consciousness', 'Severe bleeding', 'Head injury', 'Severe dehydration', 'Stroke-like symptoms',
    'Persistent vomiting', 'Severe asthma attack', 'Seizure', 'Acute confusion', 'Severe back pain with weakness',
    'Poisoning exposure', 'Severe burns', 'Fracture with deformity', 'Profuse diarrhea', 'Uncontrolled high blood sugar'
  ],
  General: [
    'Annual health checkup', 'General wellness consultation', 'Preventive care visit', 'Health screening', 'Routine physical examination',
    'Fatigue and low energy', 'Mild abdominal discomfort', 'Sore throat', 'Cough and congestion', 'Low-grade fever',
    'Back discomfort', 'Muscle aches', 'Headache', 'Weight management counseling', 'Dietary counseling',
    'Dizziness on standing', 'Mild rash', 'Allergy symptoms', 'Sleep issues', 'Medication refill'
  ]
};

const PAYMENT_METHODS = ['Card', 'Paypal', 'Bank_transfer', 'Wallet'];
const USE_STRIPE = process.argv.includes('--use-stripe');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = (USE_STRIPE && STRIPE_SECRET_KEY) ? require('stripe')(STRIPE_SECRET_KEY) : null;

async function createStripePaymentIntent(amountUSD, metadata = {}) {
  if (!stripe) return null;
  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amountUSD * 100),
      currency: 'usd',
      payment_method: 'pm_card_visa', // Stripe test card
      confirm: true,
      metadata
    }, {
      // idempotency key is helpful when re-running scripts; keep it simple/random here
    });
    // Try to obtain charge and receipt
    let chargeId = pi.charges?.data?.[0]?.id || null;
    let receiptUrl = pi.charges?.data?.[0]?.receipt_url || null;
    if (!chargeId && pi.latest_charge) {
      try {
        const ch = await stripe.charges.retrieve(pi.latest_charge);
        chargeId = ch?.id || null;
        receiptUrl = ch?.receipt_url || null;
      } catch { /* noop */ }
    }
    return {
      paymentIntentId: pi.id,
      chargeId,
      receiptUrl,
      status: pi.status === 'succeeded' ? 'Succeeded' : 'Succeeded' // treat as succeeded for seeding
    };
  } catch (e) {
    console.warn('Stripe PI creation failed in seeding script, falling back to fake IDs:', e?.message);
    return null;
  }
}

async function createStripeRefundIfNeeded(paymentIntentId, chargeId, refundAmountUSD) {
  if (!stripe) return null;
  if (!refundAmountUSD || refundAmountUSD <= 0) return null;
  try {
    if (paymentIntentId) {
      return await stripe.refunds.create({ payment_intent: paymentIntentId, amount: Math.round(refundAmountUSD * 100) });
    }
    if (chargeId) {
      return await stripe.refunds.create({ charge: chargeId, amount: Math.round(refundAmountUSD * 100) });
    }
  } catch (e) {
    console.warn('Stripe refund failed in seeding script:', e?.message);
  }
  return null;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePaymentData(doctor, patient, appointmentType, status) {
  const baseAmount = typeof doctor.fees === 'number' && !isNaN(doctor.fees) ? doctor.fees : 60;
  const amount = appointmentType === 'Emergency' ? Math.round(baseAmount * 1.5) : baseAmount;
  const platformFee = Math.round(amount * 0.10);
  const doctorEarnings = amount - platformFee;
  let paymentStatus;
  if (status === 'Cancelled') {
    paymentStatus = Math.random() > 0.3 ? 'Refunded' : 'Succeeded';
  } else {
    paymentStatus = 'Succeeded';
  }
  const refundAmount = paymentStatus === 'Refunded' ? amount : 0;
  const base = {
    amount,
    currency: 'USD',
    paymentMethod: getRandomElement(PAYMENT_METHODS),
    stripePaymentIntentId: null,
    stripeChargeId: null,
    status: paymentStatus,
    platformFee,
    doctorEarnings,
    ...(paymentStatus === 'Refunded' ? {
      refundAmount,
      refundReason: 'Appointment cancelled by patient',
      refundDate: new Date()
    } : {}),
    paymentMetadata: {
      customerEmail: patient.email,
      customerName: `${patient.firstname} ${patient.lastname}`,
      billingAddress: {
        city: 'Sample City',
        state: 'Sample State',
        country: 'US'
      }
    },
    receiptUrl: null
  };
  return base;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function pickValidDateAndTimeForDoctor(doctor, doctorShifts, startWindow, endWindow) {
  if (!doctorShifts || doctorShifts.length === 0) return { date: null, time: null, shift: null };
  for (let attempt = 0; attempt < 20; attempt++) {
    const shift = getRandomElement(doctorShifts);
    let d = getRandomDate(startWindow, endWindow);
    for (let i = 0; i < 14; i++) {
      const dn = dayNames[d.getDay()];
      if (shift.daysOfWeek?.includes(dn)) break;
      d.setDate(d.getDate() + 1);
    }
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const onLeave = await LeaveRequest.findOne({
      doctorId: doctor.userId._id,
      status: 'approved',
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    }).lean();
    if (onLeave) continue; 
    const time = generateTimeSlot(shift);
    return { date: d, time, shift };
  }
  return { date: null, time: null, shift: null };
}

function generateTimeSlot(shift) {
  const start = new Date(`2000-01-01T${shift.startTime}:00`);
  const end = new Date(`2000-01-01T${shift.endTime}:00`);
  if (end <= start) {
    // Overnight handled by schedule seeding (split). Keep here as safety.
    end.setDate(end.getDate() + 1);
  }
  const slotDuration = shift.slotDuration || 30;
  const hasBreak = !!(shift.breakTime && shift.breakTime.start && shift.breakTime.end);
  const breakStart = hasBreak ? new Date(`2000-01-01T${shift.breakTime.start}:00`) : null;
  const breakEnd = hasBreak ? new Date(`2000-01-01T${shift.breakTime.end}:00`) : null;

  // Try up to N times to find a slot not overlapping break
  for (let attempt = 0; attempt < 50; attempt++) {
    const duration = (end - start) / (1000 * 60);
    const maxSlots = Math.floor(duration / slotDuration);
    if (maxSlots <= 0) return shift.startTime;
    const randomSlot = Math.floor(Math.random() * maxSlots);
    const slotStart = new Date(start.getTime() + randomSlot * slotDuration * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
    if (hasBreak) {
      if ((slotStart >= breakStart && slotStart < breakEnd) || (slotEnd > breakStart && slotEnd <= breakEnd)) {
        continue;
      }
    }
    return slotStart.toTimeString().substring(0, 5);
  }
  return shift.startTime;
}

async function createSampleAppointments() {
  try {
    const clearExisting = process.argv.includes('--clear');
    const numAppointments = parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1]) || 50;
    console.log('🏥 Appointment Creation Script');
    console.log('=============================');
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    if (clearExisting) {
      const deletedCount = await Appointment.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing appointments`);
    }
    const doctors = await Doctor.find({ isDoctor: true }).populate('userId', 'firstname lastname');
    const patients = await User.find({ role: "Patient" });
    const shifts = await Shift.find({ isActive: true }).populate('doctorId', 'firstname lastname');
    console.log(`Found ${doctors.length} doctors, ${patients.length} patients, ${shifts.length} shifts`);
    if (doctors.length === 0 || patients.length === 0) {
      console.log('❌ Need both doctors and patients to create appointments');
      return;
    }
  const appointments = [];
  const payments = [];
  const slotBookings = [];
  const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 60);
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 60);
    for (let i = 0; i < numAppointments; i++) {
      const doctor = getRandomElement(doctors);
      const patient = getRandomElement(patients);
      const doctorShifts = shifts.filter(shift => 
        shift.doctorId?._id?.toString() === doctor.userId._id.toString()
      );
      const { date: appointmentDate, time: appointmentTime, shift: selectedShift } = await pickValidDateAndTimeForDoctor(
        doctor,
        doctorShifts,
        pastDate,
        futureDate
      );
      if (!appointmentDate || !appointmentTime) {
        continue;
      }
      const department = doctor.department || 'General';
      const specialization = doctor.specialization || 'General';
      let symptomOptions = SYMPTOMS_BY_SPECIALIZATION[department] || 
                          SYMPTOMS_BY_SPECIALIZATION[specialization] || 
                          SYMPTOMS_BY_SPECIALIZATION['General'];
      const pickSymptoms = (arr) => {
        const pool = [...arr];
        const count = Math.min(4, Math.max(2, Math.floor(Math.random() * 4) + 1));
        const chosen = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          chosen.push(pool.splice(idx, 1)[0]);
        }
        return chosen.join(', ');
      };
      const symptoms = pickSymptoms(symptomOptions);
      const appointmentType = getRandomElement(APPOINTMENT_TYPES);
            let status;
      if (appointmentDate < today) {
        // Model only allows past appointments if status === 'Completed'
        status = 'Completed';
      } else if (appointmentDate.toDateString() === today.toDateString()) {
        status = 'Confirmed';
      } else {
        const rand = Math.random();
        if (rand > 0.8) status = 'Cancelled';
        else status = 'Confirmed';
      }
      const paymentData = generatePaymentData(doctor, patient, appointmentType, status);
      const appointmentPaymentStatus = paymentData.status === 'Refunded' ? 'Refunded' : 'Paid';
      const appointment = {
        doctorId: doctor.userId._id,
        userId: patient._id,
        date: appointmentDate,
        time: appointmentTime,
        symptoms,
        appointmentType: appointmentType === 'Routine Checkup' ? 'Regular' : 
                        appointmentType === 'Specialist Referral' ? 'Consultation' : 
                        appointmentType === 'Diagnostic' ? 'Regular' :
                        appointmentType === 'Treatment' ? 'Regular' :
                        appointmentType === 'Preventive Care' ? 'Regular' :
                        appointmentType,
        status: status,
        priority: appointmentType === 'Emergency' ? 'High' : 
                 appointmentType === 'Follow-up' ? 'Normal' : 'Normal',
        paymentStatus: appointmentPaymentStatus,
        // Use estimatedDuration field defined in model
        estimatedDuration: appointmentType === 'Emergency' ? 60 : 
                           appointmentType === 'Consultation' ? 45 : 30,
        notes: `${appointmentType} appointment for ${symptoms}`,
        createdAt: new Date(appointmentDate.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Created 0-14 days before
        ...(status === 'Cancelled' ? {
          cancellationReason: Math.random() > 0.5 ? 'Patient requested cancellation' : 'Doctor unavailable',
          cancellationDate: paymentData.status === 'Refunded' ? paymentData.refundDate : new Date()
        } : {}),
        ...(status === 'Completed' ? {} : {})
      };
      
      appointments.push(appointment);
      // Queue up payment to be linked later
      payments.push({
        ...paymentData,
        patientId: patient._id,
        doctorId: doctor.userId._id,
      });
      slotBookings.push({ doctorId: doctor.userId._id, shift: selectedShift, date: appointmentDate, time: appointmentTime });
    }
    const savedAppointments = await Appointment.insertMany(appointments);
    console.log(`✅ Created ${savedAppointments.length} appointments`);
    
    const linkedPayments = [];
    for (let i = 0; i < payments.length; i++) {
      const payment = { ...payments[i] };
      payment.appointmentId = savedAppointments[i]._id;
      if (stripe) {
        const meta = {
          appointmentSeedIndex: String(i),
          doctorId: String(payment.doctorId || ''),
          patientEmail: payment.paymentMetadata?.customerEmail || ''
        };
        const stripeResult = await createStripePaymentIntent(payment.amount, meta);
        if (stripeResult) {
          payment.stripePaymentIntentId = stripeResult.paymentIntentId;
          payment.stripeChargeId = stripeResult.chargeId;
          payment.receiptUrl = stripeResult.receiptUrl;
          payment.status = payments[i].status; // keep seeded status
          if (payment.status === 'Refunded' && payment.refundAmount > 0) {
            await createStripeRefundIfNeeded(payment.stripePaymentIntentId, payment.stripeChargeId, payment.refundAmount);
          }
        } else {
          // Fallback fake IDs to keep shape consistent
          payment.stripePaymentIntentId = `pi_${Math.random().toString(36).substr(2, 24)}`;
          payment.stripeChargeId = `ch_${Math.random().toString(36).substr(2, 24)}`;
          payment.receiptUrl = `https://pay.stripe.com/receipts/${Math.random().toString(36).substr(2, 20)}`;
        }
      } else {
        // No Stripe: keep synthetic IDs for shape
        payment.stripePaymentIntentId = `pi_${Math.random().toString(36).substr(2, 24)}`;
        payment.stripeChargeId = `ch_${Math.random().toString(36).substr(2, 24)}`;
        payment.receiptUrl = `https://pay.stripe.com/receipts/${Math.random().toString(36).substr(2, 20)}`;
      }
      linkedPayments.push(payment);
    }
    
    const savedPayments = await Payment.insertMany(linkedPayments);
    console.log(`💰 Created ${linkedPayments.length} payment records`);

    // Attach paymentId back to appointments
    const bulkPaymentLinks = savedAppointments.map((apt, idx) => ({
      updateOne: {
        filter: { _id: apt._id },
        update: { $set: { paymentId: savedPayments[idx]?._id || null } }
      }
    }));
    await Appointment.bulkWrite(bulkPaymentLinks);

    // Ensure and book time slots for each appointment
    for (let i = 0; i < savedAppointments.length; i++) {
      const apt = savedAppointments[i];
      const booking = slotBookings[i];
      if (!booking || !booking.shift) continue;
      try {
        const shift = booking.shift; // populated Shift from earlier
        const slotDuration = shift.slotDuration || 30;
        const [h, m] = booking.time.split(':').map(Number);
        const startMinutes = h * 60 + m;
  let endMinutes = startMinutes + slotDuration;
  // Clamp to same-day 23:59 to satisfy HH:MM 0-23 validation
  const maxMinutes = 23 * 60 + 59;
  if (endMinutes > maxMinutes) endMinutes = maxMinutes;
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');
  const slotStart = booking.time;
  const slotEnd = `${endH}:${endM}`;

        const day = new Date(booking.date);
        day.setHours(0,0,0,0);

        // Find or create the matching timeslot
        let slot = await TimeSlot.findOne({
          shiftId: shift._id,
          doctorId: booking.doctorId,
          date: day,
          startTime: slotStart,
          endTime: slotEnd
        });
        if (!slot) {
          slot = new TimeSlot({
            shiftId: shift._id,
            doctorId: booking.doctorId,
            date: day,
            startTime: slotStart,
            endTime: slotEnd,
            maxPatients: shift.maxPatientsPerHour || 4,
            bookedPatients: 0,
            isAvailable: true,
            isBlocked: false
          });
        }
        // Book slot respecting capacity
        if (slot.bookedPatients < slot.maxPatients && !slot.isBlocked) {
          slot.bookedPatients += 1;
          slot.appointments = Array.isArray(slot.appointments) ? slot.appointments : [];
          slot.appointments.push(apt._id);
          if (slot.bookedPatients >= slot.maxPatients) slot.isAvailable = false;
          await slot.save();
          // Link appointment to timeslot
          await Appointment.updateOne({ _id: apt._id }, { $set: { timeSlotId: slot._id } });
        }
      } catch (e) {
        console.warn('⚠️ Slot booking failed for seeded appointment:', e?.message);
      }
    }

    // Show summary
    const statusSummary = {};
    const typeSummary = {};
    const doctorSummary = {};
    const paymentSummary = {};
    let totalRevenue = 0;
    let totalRefunds = 0;
    
    savedAppointments.forEach((apt, index) => {
      statusSummary[apt.status] = (statusSummary[apt.status] || 0) + 1;
      typeSummary[apt.appointmentType] = (typeSummary[apt.appointmentType] || 0) + 1;
      
      const doctor = doctors.find(d => d.userId._id.toString() === apt.doctorId.toString());
      const doctorName = `Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}`;
      doctorSummary[doctorName] = (doctorSummary[doctorName] || 0) + 1;
      
      // Payment summary
      const payment = linkedPayments[index];
      paymentSummary[payment.status] = (paymentSummary[payment.status] || 0) + 1;
      totalRevenue += payment.amount;
      totalRefunds += payment.refundAmount || 0;
    });

    console.log('\\n📊 Appointment Summary:');
    console.log('By Status:');
    Object.entries(statusSummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\\nBy Type:');
    Object.entries(typeSummary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\\nTop Doctors by Appointments:');
    const topDoctors = Object.entries(doctorSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topDoctors.forEach(([doctor, count]) => {
      console.log(`  ${doctor}: ${count} appointments`);
    });
    
    console.log('\\n💰 Financial Summary:');
    console.log('Payment Status:');
    Object.entries(paymentSummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log(`\\nTotal Revenue: $${totalRevenue.toLocaleString()}`);
    console.log(`Total Refunds: $${totalRefunds.toLocaleString()}`);
    console.log(`Net Revenue: $${(totalRevenue - totalRefunds).toLocaleString()}`);
    console.log(`Refund Rate: ${((totalRefunds / totalRevenue) * 100).toFixed(1)}%`);

    console.log('\\n🎉 Appointments created successfully!');

  } catch (error) {
    console.error('❌ Error creating appointments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createSampleAppointments();
