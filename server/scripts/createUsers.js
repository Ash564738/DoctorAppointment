const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = "mongodb://localhost:27017/doctorappointment";

mongoose
  .connect(process.env.MONGO_URI || MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const specializationToDepartment = {
  "Allergists/Immunologists": "Internal Medicine - Allergy & Immunology",
  "Anesthesiologists": "Anesthesiology",
  "Cardiologists": "Cardiovascular Medicine",
  "Colon and Rectal Surgeons": "Surgery - Colorectal Surgery",
  "Critical Care Medicine Specialists": "Critical Care Medicine",
  "Dermatologists": "Dermatology",
  "Emergency Medicine Physicians": "Emergency Medicine",
  "Endocrinologists": "Internal Medicine - Endocrinology",
  "Family Medicine Physicians": "Family Medicine",
  "Gastroenterologists": "Internal Medicine - Gastroenterology & Hepatology",
  "General Surgeons": "Surgery",
  "Geriatricians": "Medicine - Geriatrics",
  "Hematologists": "Medicine - Hematology/Oncology",
  "Infectious Disease Specialists": "Medicine - Infectious Diseases",
  "Internal Medicine Physicians": "Internal Medicine",
  "Nephrologists": "Medicine - Nephrology",
  "Neurologists": "Neurology",
  "Neurosurgeons": "Neurological Surgery",
  "Obstetricians and Gynecologists": "Obstetrics & Gynecology",
  "Oncologists": "Oncology",
  "Ophthalmologists": "Ophthalmology",
  "Orthopedic Surgeons": "Orthopaedic Surgery",
  "Otolaryngologists": "Otolaryngology (ENT)",
  "Pathologists": "Pathology & Laboratory Medicine",
  "Pediatricians": "Pediatrics",
  "Physical Medicine and Rehabilitation Physicians": "Physical Medicine & Rehabilitation",
  "Plastic Surgeons": "Plastic Surgery",
  "Podiatrists": "Podiatry",
  "Preventive Medicine Physicians": "Preventive Medicine/Public Health",
  "Psychiatrists": "Psychiatry",
  "Pulmonologists": "Medicine - Pulmonary, Allergy & Critical Care",
  "Radiologists": "Radiology",
  "Rheumatologists": "Medicine - Rheumatology",
  "Urologists": "Urology"
};

// Creative meme-style name pools (letters/spaces only), phrases can be multi-word
const creativeFirstPhrases = [
  'Danger Noodle','Sea Pancake','Land Cloud','Long Horse','Tuxedo Chicken','Walking Rock','Giraffe Sheep','River Scissors',
  'Wizard Cow','Tank Rat','Dice Beetle','Ocean Elephant','Radar Mouse','Arrow Rabbit','Prison Horse','Water Cat',
  'Dragon Shrimp','Kickboxing Rabbit','Ocean Spider','Jungle Tuba','Beach Chicken','Honk Monster','Limousine Rat','Leather Tank Puppy',
  'Jelly Mohawk','Floppy Sea Spider','Danger Log','Tree Headed Horse','Spiky Potato','Trash Panda','Nope Rope','Sneaky Snek',
  'Blep Panther','Majestic Floof','Noodle Leopard','Boop Fox','Scream Goose','Wiggle Shark','Derp Lizard','Bark Cat',
  'Sneezle Weasel','Zoom Hedgehog','Wobble Duck','Chonk Tiger','Puddle Wolf','Snuggle Bear','Grumpy Owl','Derpy Dolphin',
  'Sparkle Giraffe','Tiny Elephant','Silly Zebra','Boopable Tapir','Mystic Yak','Whisper Lynx','Waffle Penguin','Bubble Tortoise',
  'Pounce Cougar','Mlem Lion','Wiggle Otter','Drift Raven','Giggle Jay','Marble Swan','Nimbus Heron','Velvet Crane',
  'Pebble Bison','Dapper Peacock','Comfy Sloth','Sunny Quokka','Cosmic Capybara','Moonlight Ibex','Dreamy Gazelle','Bouncy Marmot'
];
const creativeLastPhrases = [
  'Supreme of the Meadow','Of The High Seas','From The Treetops','Of The Hidden Valley','Of Midnight Forests','Keeper of Snacks',
  'Bringer of Smiles','Of Eternal Zoomies','From Cozy Caves','Of Loud Honks','Wielder of Bleps','Guardian of Naps','Of Soft Paw Steps',
  'Master of Wiggles','From Cloudy Peaks','Of Gentle Boops','Of Infinite Fluff','From Sunny Shores','Of Silent Pounces','Of Calm Waters',
  'From Mystic Marsh','Of Swift Shadows','From Shimmering Dunes','Of Bright Feathers','From Secret Groves','Of Playful Streams',
  'Of Rolling Thunder','From Whispering Pines','Of Golden Fields','From Silver Lakes','Of Velvet Nights','From Sparkling Tides',
  'Of Dancing Leaves','From Stargazer Plains','Of Hidden Hollows','From Moonlit Cliffs','Of Snowy Trails','From Emerald Isles',
  'Of Gentle Breezes','From Starlit Docks','Of Laughing Brooks','From Quiet Meadows','Of Warm Sunbeams','From Ancient Oaks',
  'Of Twinkling Skies','From River Stones','Of Feathered Drifts','From Amber Groves','Of Blue Horizons','From Secret Springs'
];

// Meme/animal image list (50+)
const memeAnimalPics = [
  "https://i.pinimg.com/1200x/50/50/ad/5050adb94d8694c29a0dba1a7081e03a.jpg",
  "https://i.pinimg.com/736x/11/0b/7a/110b7abdeb4564b7fc621f4eb6366cdb.jpg",
  "https://i.pinimg.com/736x/d3/6c/e0/d36ce01c2ff2642c1315082687354a22.jpg",
  "https://i.pinimg.com/736x/9b/42/a7/9b42a7bd22dfa5c84afb0e7489a643ca.jpg",
  "https://i.pinimg.com/736x/33/21/15/332115b3c16a054e9cf54c0ded666db5.jpg",
  "https://i.pinimg.com/736x/b6/2d/4c/b62d4c1c6f3548e2960b29a9261a672e.jpg",
  "https://i.pinimg.com/736x/ba/ad/f2/baadf24ae7ff76b320dfd153d6e22a64.jpg",
  "https://i.pinimg.com/736x/39/e9/75/39e975af33e4d777b347306cd3fa6604.jpg",
  "https://i.pinimg.com/736x/6e/57/44/6e5744e43975b28d479357593c2199a1.jpg",
  "https://i.pinimg.com/736x/b9/7e/dd/b97edd06020067c2f3688f23cfb61794.jpg",
  "https://i.pinimg.com/736x/19/1a/9a/191a9a623ae19aaa295049a4de1688fe.jpg",
  "https://i.pinimg.com/736x/d0/c8/c9/d0c8c9cabd200391d5e950fd7a5ecee4.jpg",
  "https://i.pinimg.com/736x/94/b4/97/94b49706e0e421c8d2a4a620dbb653ba.jpg",
  "https://i.pinimg.com/1200x/06/5f/5b/065f5bcfd27e3f7260951be1d1877a97.jpg",
  "https://i.pinimg.com/736x/9a/7f/d2/9a7fd25f6ecde4ab6c8ac03b0b47c68e.jpg",
  "https://i.pinimg.com/736x/9c/67/38/9c6738bf74f94adf5ed0f9e4170cbf2d.jpg",
  "https://i.pinimg.com/736x/c2/06/4e/c2064e2cbaf2cdd8248bceaac7afc684.jpg",
  "https://i.pinimg.com/736x/d1/9d/eb/d19deb142730c2f6e85e78c318b21032.jpg",
  "https://i.pinimg.com/736x/b5/3c/9a/b53c9a742d4644fdc1ec113fd4a667ad.jpg",
  "https://i.pinimg.com/736x/77/8d/06/778d0682c8c9f76a4df48247f9ec51ff.jpg",
  "https://i.pinimg.com/736x/d1/9b/1e/d19b1ef0aeeba604db7454b79c0e213f.jpg",
  "https://i.pinimg.com/736x/1b/3c/1a/1b3c1a5414c66543fef608d32972f315.jpg",
  "https://i.pinimg.com/1200x/86/bd/cc/86bdccac55661b840ac2050a3fe4c359.jpg",
  "https://i.pinimg.com/736x/2f/41/7e/2f417ee025a58c30d6ce4bc469110068.jpg",
  "https://i.pinimg.com/736x/68/1a/33/681a33449bb3c786f87634e48bf12bb7.jpg",
  "https://i.pinimg.com/736x/26/fd/65/26fd656c3a995a0035e75f8278db8e6b.jpg",
  "https://i.pinimg.com/736x/7e/22/57/7e2257431ec9a15dbab37fe8a47caf0e.jpg",
  "https://i.pinimg.com/736x/9b/47/ac/9b47ac6e3abd2946fddb1dfe8cdd8852.jpg",
  "https://i.pinimg.com/736x/5d/34/37/5d343763fabebcd06c3d8be80955cbf4.jpg",
  "https://i.pinimg.com/736x/f0/25/e2/f025e25e257d57e05d29082ba05fa131.jpg",
  "https://i.pinimg.com/736x/27/f7/5e/27f75e05e47b9d1956e32cdaab9eefb2.jpg",
  "https://i.pinimg.com/736x/46/e6/67/46e6676ad6444c5df4b95d8823d420eb.jpg",
  "https://i.pinimg.com/736x/83/b5/78/83b5780589d5057ddf9f00c99b8aec51.jpg",
  "https://i.pinimg.com/736x/3c/a2/e9/3ca2e93f4fd079363b42f8d8114b4e82.jpg",
  "https://i.pinimg.com/736x/e2/46/b6/e246b61fa3023e6d4cf9af242e8c402c.jpg",
  "https://i.pinimg.com/736x/be/24/aa/be24aa12dd2b891e0a98a4ecef4f1449.jpg",
  "https://i.pinimg.com/736x/13/ab/78/13ab78cf52f96093563fbdfe21b72e47.jpg",
  "https://i.pinimg.com/736x/9e/f6/21/9ef621a7a89997eb17be0653c56db95b.jpg",
  "https://i.pinimg.com/736x/1d/ba/a8/1dbaa8b1e6d1a726d761eb740ab9ca1c.jpg",
  "https://i.pinimg.com/736x/f3/39/f1/f339f1cde046045dbe25ec866c7a7778.jpg",
  "https://i.pinimg.com/736x/c4/ad/7f/c4ad7fc52206cc387b7598abc32d89ac.jpg",
  "https://i.pinimg.com/736x/72/28/77/7228771905f15f68afcbd790a93f456c.jpg",
  "https://i.pinimg.com/736x/58/2d/9b/582d9be3d56b3f46ba7a540d761ea6e2.jpg",
  "https://i.pinimg.com/736x/89/37/1e/89371eaac425fdc5014ef7207a49b89f.jpg",
  "https://i.pinimg.com/1200x/29/15/5a/29155ac3829c56ed914250476cc5b86b.jpg",
  "https://i.pinimg.com/736x/cd/04/5d/cd045d2f60aadbbc0532d398f780c361.jpg",
  "https://i.pinimg.com/736x/46/f4/88/46f4885495c1ed7ca2dbfd4787b06bb6.jpg",
  "https://i.pinimg.com/736x/c1/61/f9/c161f9e881fa9a230042ed620d0dce0c.jpg",
  "https://i.pinimg.com/736x/35/5b/3d/355b3d62469fe5a5a13f11418268e34a.jpg",
  "https://i.pinimg.com/736x/2c/6f/b6/2c6fb6948ad7603ef120f1af5aa98137.jpg",
  "https://i.pinimg.com/736x/71/e1/8a/71e18a49e9489d5aa5c1e7ffc143bd36.jpg",
  "https://i.pinimg.com/736x/a4/97/0d/a4970d0a5ca624368625336fd2ef27f0.jpg",
  "https://i.pinimg.com/736x/c8/d5/6a/c8d56a845baf9945f4116cca0d3efc39.jpg",
  "https://i.pinimg.com/736x/26/53/48/265348decdcff9f66ad923abf04a5acc.jpg",
  "https://i.pinimg.com/736x/dd/89/16/dd8916db5ca22fcba24bafd5b5f41d42.jpg",
  "https://i.pinimg.com/736x/68/ed/e4/68ede4d1cff8a61dc03ffdefd4fa407c.jpg",
  "https://i.pinimg.com/736x/35/5b/3d/355b3d62469fe5a5a13f11418268e34a.jpg",
  "https://i.pinimg.com/736x/68/1a/33/681a33449bb3c786f87634e48bf12bb7.jpg",
  "https://i.pinimg.com/736x/1d/77/cb/1d77cb3dea0738f5f0a2b6baef050cc9.jpg",
  "https://i.pinimg.com/736x/f4/25/c9/f425c97e6f5db6e8e544a18fa33951d4.jpg",
  "https://i.pinimg.com/736x/5c/0a/d2/5c0ad25020cb01e39e19a79a6f44f92c.jpg",
  "https://i.pinimg.com/736x/d0/b0/ad/d0b0ad9455df702aa7dab8ab12b41a72.jpg",
  "https://i.pinimg.com/736x/b1/61/6d/b1616d29cc7e313f788fa530f45e8ee6.jpg",
  "https://i.pinimg.com/736x/0e/52/e0/0e52e06bd3695e80a10fe22a30e59716.jpg",
  "https://i.pinimg.com/736x/3f/e8/91/3fe891e9fd5947972045c367f689ce6d.jpg",
  "https://i.pinimg.com/736x/fa/da/55/fada55bf00b3f6843a5b7c09f28e4919.jpg",
  "https://i.pinimg.com/736x/77/b8/b5/77b8b5bddfed87c393ac9c7b6f0c91f2.jpg",
  "https://i.pinimg.com/736x/66/17/dd/6617dd06a096ceeb1bb0b676c9f98427.jpg",
  "https://i.pinimg.com/736x/d6/cf/d2/d6cfd20cd5616c58f25f96e12baadbfc.jpg",
  "https://i.pinimg.com/736x/50/65/a3/5065a380b75272c98f7bdf42052a19f9.jpg",
  "https://i.pinimg.com/736x/b8/6d/13/b86d131eb90037547aa805af811b3429.jpg",
  "https://i.pinimg.com/736x/1a/b7/77/1ab7771804cdecc865619c67b639dc05.jpg",
  "https://i.pinimg.com/736x/f1/e7/02/f1e7020149c14e3aeaa42133a61071d2.jpg",
  "https://i.pinimg.com/736x/cd/4a/a5/cd4aa51da6dbcbc404aa46803ace9564.jpg",
  "https://i.pinimg.com/736x/55/71/e2/5571e235d356cb1793cdb5378d3e25b7.jpg",
  "https://i.pinimg.com/736x/85/32/c4/8532c4aa0379f0c3d19932afcace08c1.jpg",
  "https://i.pinimg.com/736x/ba/22/ef/ba22efe80aae50fefafd9b7b83b5dfe7.jpg",
  "https://i.pinimg.com/1200x/72/cd/a4/72cda476a162a3a4ee1b18f6882e8760.jpg",
  "https://i.pinimg.com/736x/06/64/b8/0664b870380fc09b0c76c0d1791aece5.jpg",
  "https://i.pinimg.com/736x/5e/3b/db/5e3bdba539ce3c9102e4035be33ee235.jpg",
  "https://i.pinimg.com/736x/bc/fd/1b/bcfd1bd2731b2455f523e049b673c223.jpg",
  "https://i.pinimg.com/736x/69/d5/69/69d5695f005d4584fe6bda5b53a4f1d3.jpg",
];
// Utility: shuffle array
function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Shuffled pools
const shuffledPics = shuffleArray(memeAnimalPics);

// Build a large pool of unique first/last pairs and shuffle
function buildNamePool() {
  const pairs = [];
  const firsts = shuffleArray(creativeFirstPhrases);
  const lasts = shuffleArray(creativeLastPhrases);
  for (const f of firsts) {
    for (const l of lasts) {
      pairs.push({ first: f, last: l });
    }
  }
  return shuffleArray(pairs);
}
const NAME_POOL = buildNamePool();
let namePtr = 0;
const usedNames = new Set();
function takeUniqueName() {
  while (namePtr < NAME_POOL.length) {
    const { first, last } = NAME_POOL[namePtr++];
    const full = `${first} ${last}`;
    if (!usedNames.has(full)) {
      usedNames.add(full);
      return { firstname: first, lastname: last };
    }
  }
  // Fallback: in the unlikely event of exhaustion, append a letter suffix
  const idx = usedNames.size % 26;
  const suffix = String.fromCharCode(65 + idx);
  const { first, last } = NAME_POOL[usedNames.size % NAME_POOL.length];
  const fname = `${first}${suffix}`;
  const lname = last;
  usedNames.add(`${fname} ${lname}`);
  return { firstname: fname, lastname: lname };
}

// Get pic (patients/admins can reuse from curated set)
function getPicForIndex(index) {
  return shuffledPics[index % shuffledPics.length];
}

// For doctors, ensure memeAnimalPics are used without duplication among the first 80
function getDoctorMemePic(index) {
  if (index < shuffledPics.length) return shuffledPics[index];
  // Fallback (should rarely happen): wrap but append a distinct queryless suffix using a different extension if available
  return shuffledPics[index % shuffledPics.length];
}

const specializations = Object.keys(specializationToDepartment);

// Create Admins
const createAdmins = async () => {
  const admins = [
    { ...takeUniqueName(), email: 'admin@hospital.com' },
    { ...takeUniqueName(), email: 'admin2@hospital.com' }
  ];
  for (const [i, admin] of admins.entries()) {
    if (await User.findOne({ email: admin.email })) {
      console.log(`Admin ${admin.email} exists, skipping`);
      continue;
    }
    await new User({
      ...admin,
      password: 'Admin@123',
      role: 'Admin',
      gender: 'other',
      mobile: '+1234567890',
      address: 'Hospital HQ, Medical Avenue',
      status: 'Active',
      pic: getPicForIndex(i),
      isEmailVerified: true
    }).save();
    console.log(`✅ Admin created: ${admin.email}`);
  }
};

// Create Doctors
const createDoctors = async () => {
  const genders = ['male','female','other'];
  const bloodGroups = ['A+','B+','O+','AB+','A-','B-','O-','AB-'];

  for (let i = 0; i < 80; i++) {
    const email = `doctor${i+1}@hospital.com`;
    if (await User.findOne({ email })) continue;

    const name = takeUniqueName();
    const doctorUser = new User({
      ...name,
      email,
      password: 'Doctor@123',
      role: 'Doctor',
      gender: genders[Math.floor(Math.random()*genders.length)],
      mobile: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      address: `${Math.floor(100 + Math.random() * 900)} Sakura Street, Suite ${i+1}`,
      status: 'Active',
      pic: getDoctorMemePic(i),
      isEmailVerified: true,
      age: Math.floor(25 + Math.random() * 30),
      bloodGroup: bloodGroups[Math.floor(Math.random()*bloodGroups.length)],
      dateOfBirth: new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    });

    const savedUser = await doctorUser.save();
    const chosenSpec = specializations[Math.floor(Math.random()*specializations.length)];
    const chosenDept = specializationToDepartment[chosenSpec];

    await new Doctor({
      userId: savedUser._id,
      specialization: chosenSpec,
      department: chosenDept,
      experience: Math.floor(1 + Math.random() * 20),
      fees: Math.floor(50 + Math.random() * 200),
      isDoctor: true
    }).save();

    console.log(`🐾 Doctor created: ${doctorUser.firstname} ${doctorUser.lastname} — ${chosenSpec} (${chosenDept})`);
  }
};

// Create Patients
const createPatients = async () => {
  const genders = ['male','female','other'];
  const bloodGroups = ['O-','A-','B-','AB-','A+','B+','O+','AB+'];
  for (let i = 0; i < 20; i++) {
    const email = `patient${i+1}@example.com`;
    if (await User.findOne({ email })) continue;

    const name = takeUniqueName();
    const patientUser = new User({
      ...name,
      email,
      password: 'Patient@123',
      role: 'Patient',
      gender: genders[Math.floor(Math.random()*genders.length)],
      mobile: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      address: `${Math.floor(100 + Math.random() * 900)} Residential Avenue, Apt ${i+1}`,
      status: 'Active',
      pic: getPicForIndex(i+32),
      isEmailVerified: true,
      age: Math.floor(18 + Math.random() * 70),
      bloodGroup: bloodGroups[Math.floor(Math.random()*bloodGroups.length)],
      familyDiseases: Math.random() > 0.5 ? 'None' : 'Hypertension, Diabetes, Heart Disease',
      dateOfBirth: new Date(1945 + Math.floor(Math.random() * 55), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    });
    await patientUser.save();
    console.log(`🐾 Patient created: ${patientUser.firstname} ${patientUser.lastname}`);
  }
};

// Main
const createUsers = async () => {
  try {
    console.log('Starting user creation process...');
    await createAdmins();
    await createDoctors();
    await createPatients();
    console.log('✅ All users created successfully!');
    console.log('\n--- Login Info ---');
    console.log('Admins: admin@hospital.com, admin2@hospital.com / Admin@123');
  console.log('Doctors: doctor1@hospital.com → doctor80@hospital.com / Doctor@123');
    console.log('Patients: patient1@example.com → patient20@example.com / Patient@123');
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error in user creation process:', error);
  }
};

createUsers();