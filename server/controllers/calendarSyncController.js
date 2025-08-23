const CalendarSync = require('../models/calendarSyncModel');
const { google } = require('googleapis');

// Add or update calendar sync settings for a user
exports.upsertCalendarSync = async (req, res) => {
  try {
    const userId = req.userId;
    const { provider, accessToken, refreshToken } = req.body;
    if (!provider || !accessToken) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    const sync = await CalendarSync.findOneAndUpdate(
      { userId, provider },
      { accessToken, refreshToken, syncEnabled: true, lastSync: null, error: null },
      { upsert: true, new: true }
    );
    res.json({ success: true, sync });
  } catch (error) {
    console.error('Error upserting calendar sync:', error);
    res.status(500).json({ success: false, message: 'Failed to save calendar sync.' });
  }
};

// Get calendar sync settings for a user
exports.getCalendarSync = async (req, res) => {
  try {
    const userId = req.userId;
    const sync = await CalendarSync.find({ userId });
    res.json({ success: true, sync });
  } catch (error) {
    console.error('Error fetching calendar sync:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar sync.' });
  }
};

// Remove calendar sync for a user
exports.deleteCalendarSync = async (req, res) => {
  try {
    const userId = req.userId;
    const { provider } = req.body;
    await CalendarSync.deleteOne({ userId, provider });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar sync:', error);
    res.status(500).json({ success: false, message: 'Failed to delete calendar sync.' });
  }
};

// Sync appointments to Google Calendar (demo)
exports.syncAppointmentsToGoogle = async (req, res) => {
  try {
    // This is a stub for demo purposes
    // In production, use googleapis and OAuth2
    res.json({ success: true, message: 'Appointments synced to Google Calendar (demo).' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to sync appointments.' });
  }
};
