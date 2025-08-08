const Notification = require("../models/notificationModel");

const getallnotifs = async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.locals });
    return res.send(notifs);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).send("Unable to get all notifications");
  }
};

const clearallnotifs = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.locals });
    return res.status(200).send("All notifications cleared successfully");
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).send("Unable to clear notifications");
  }
};

module.exports = {
  getallnotifs,
  clearallnotifs,
};
