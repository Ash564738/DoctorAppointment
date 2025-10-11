require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/appointmentModel');
const Rating = require('../models/ratingModel');
const Notification = require('../models/notificationModel');

function getArg(name, def) {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  if (!found) return def;
  const val = found.substring(prefix.length);
  if (val === '') return def;
  if (!isNaN(val)) return Number(val);
  return val;
}
function hasFlag(name) { return process.argv.includes(`--${name}`); }

const CLEAR = hasFlag('clear');
const LIMIT = getArg('limit', 100);
const PERCENT = Math.min(100, Math.max(0, getArg('percent', 70)));
const MIN_SCORE = Math.min(5, Math.max(1, getArg('min-score', 3)));
const MAX_SCORE = Math.min(5, Math.max(1, getArg('max-score', 5)));
const DAYS_BACK = getArg('days-back', 365);
const ONLY_DOCTOR = getArg('doctorId', null);
const ONLY_PATIENT = getArg('patientId', null);
const DRY_RUN = hasFlag('dry-run');

if (MIN_SCORE > MAX_SCORE) {
  console.error('Invalid score range: min-score cannot be greater than max-score');
  process.exit(1);
}

const COMMENTS_BY_SCORE = {
  5: [
    'Excellent experience! Very professional and kind.',
    'Outstanding care and attention to detail.',
    'Highly recommend—great communication and service.'
  ],
  4: [
    'Very good overall, would return again.',
    'Good experience and clear guidance.',
    'Helpful and professional.'
  ],
  3: [
    'Average experience, room for improvement.',
    'It was okay, but some issues remained.',
    'Service was acceptable.'
  ],
  2: [
    'Below expectations; communication could be better.',
    'Not very satisfied with the consultation.'
  ],
  1: [
    'Unsatisfactory; would not recommend.',
    'Poor experience overall.'
  ]
};

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomScore(minS, maxS) {
  // Bias slightly towards higher ratings (4-5) when allowed
  const allowed = [];
  for (let s = minS; s <= maxS; s++) allowed.push(s);
  if (allowed.includes(5) || allowed.includes(4)) {
    const weighted = [];
    allowed.forEach(s => {
      const w = s >= 4 ? 3 : (s === 3 ? 2 : 1);
      for (let i = 0; i < w; i++) weighted.push(s);
    });
    return pickRandom(weighted);
  }
  return pickRandom(allowed);
}

async function createRatings() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/doctorappointment';
  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB');

  try {
    if (CLEAR) {
      const r = await Rating.deleteMany({});
      console.log(`🗑️ Cleared ${r.deletedCount} existing ratings`);
    }

    const since = new Date();
    since.setDate(since.getDate() - Number(DAYS_BACK));

    // Build appointment filter
    const filter = { status: 'Completed', date: { $gte: since } };
    if (ONLY_DOCTOR) filter.doctorId = ONLY_DOCTOR;
    if (ONLY_PATIENT) filter.userId = ONLY_PATIENT;

    const appts = await Appointment.find(filter)
      .select('_id doctorId userId date time status')
      .lean();

    if (!appts.length) {
      console.log('❌ No eligible completed appointments found');
      return;
    }
    console.log(`Found ${appts.length} eligible completed appointments since ${since.toISOString().slice(0,10)}`);

    // Shuffle to randomize selection
    const shuffled = appts.sort(() => Math.random() - 0.5);
    const targetCount = Math.min(LIMIT, Math.floor((PERCENT / 100) * shuffled.length) || 0);

    let created = 0;
    const scoreCounts = { 1:0,2:0,3:0,4:0,5:0 };

    for (const apt of shuffled) {
      if (created >= targetCount) break;
      const appointmentId = apt._id;
      const doctorId = apt.doctorId; // doctorId is User _id in Appointment
      const patientId = apt.userId;
      if (!doctorId || !patientId) continue;

      // Unique constraint guard
      const exists = await Rating.findOne({ appointmentId, patientId }).lean();
      if (exists) continue;

      // Simple sampling by percent
      if (Math.random() * 100 > PERCENT) continue;

      const score = randomScore(MIN_SCORE, MAX_SCORE);
      const commentPool = COMMENTS_BY_SCORE[score] || [''];
      const comment = pickRandom(commentPool);

      if (DRY_RUN) {
        console.log(`(dry-run) Would create rating: apt=${appointmentId} score=${score} by patient=${patientId} for doctor=${doctorId}`);
        created += 1;
        scoreCounts[score] += 1;
        continue;
      }

      // Create rating
      const rating = new Rating({ appointmentId, doctorId, patientId, rating: score, comment });
      await rating.save();

      // Notify doctor and patient (mirror controller behavior)
      const appointmentDate = apt.date ? new Date(apt.date).toLocaleDateString() : '';
      await Notification.create({
        userId: doctorId,
        content: `You received a ${score}-star rating for appointment on ${appointmentDate}${comment ? `: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"` : ''}`
      });
      await Notification.create({
        userId: patientId,
        content: `Thank you for rating your appointment${appointmentDate ? ` on ${appointmentDate}` : ''}.`
      });

      created += 1;
      scoreCounts[score] += 1;
      console.log(`⭐ Created rating (${score}★) for appointment ${appointmentId}`);
    }

    console.log(`\n✅ Ratings seeding complete. Created ${created} rating(s).`);
    console.log('Score distribution:', scoreCounts);
  } catch (err) {
    console.error('❌ Error creating ratings:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createRatings();
