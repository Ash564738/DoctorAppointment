const Insurance = require('../models/insuranceModel');
const User = require('../models/userModel');

// Add or update insurance info for a user
exports.upsertInsurance = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      provider,
      policyNumber,
      groupNumber,
      coverageType,
      validFrom,
      validTo,
      notes
    } = req.body;

    if (!provider || !policyNumber || !validFrom || !validTo) {
      return res.status(400).json({ success: false, message: 'Missing required insurance fields.' });
    }

    const insurance = await Insurance.findOneAndUpdate(
      { userId },
      {
        provider,
        policyNumber,
        groupNumber,
        coverageType,
        validFrom,
        validTo,
        notes,
        isActive: new Date(validTo) > new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, insurance });
  } catch (error) {
    console.error('Error upserting insurance:', error);
    res.status(500).json({ success: false, message: 'Failed to save insurance info.' });
  }
};

// Get insurance info for a user
exports.getInsurance = async (req, res) => {
  try {
    const userId = req.userId;
    const insurance = await Insurance.findOne({ userId });
    if (!insurance) {
      return res.status(404).json({ success: false, message: 'No insurance info found.' });
    }
    res.json({ success: true, insurance });
  } catch (error) {
    console.error('Error fetching insurance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch insurance info.' });
  }
};

// Admin: get all insurances
exports.getAllInsurances = async (req, res) => {
  try {
    const insurances = await Insurance.find().populate('userId', 'firstname lastname email');
    res.json({ success: true, insurances });
  } catch (error) {
    console.error('Error fetching all insurances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch insurances.' });
  }
};

// Delete insurance info
exports.deleteInsurance = async (req, res) => {
  try {
    const userId = req.userId;
    await Insurance.deleteOne({ userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting insurance:', error);
    res.status(500).json({ success: false, message: 'Failed to delete insurance info.' });
  }
};
