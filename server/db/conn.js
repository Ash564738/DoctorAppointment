const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";

const client = mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    try {
      const { info } = require('../utils/logger');
      info('Database connected successfully', { mongoUri: MONGO_URI ? 'Configured' : 'Not configured' });
    } catch {}
    return mongoose.connection;
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    throw error;
  });

module.exports = client;

