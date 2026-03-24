const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authJwt = require("../middleware/authJwt");

// GET /notifications — get user's notifications
router.get("/", authJwt, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter || ""; // all, read, unread
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = { user: req.user.userId };
    
    if (filter === "read") {
      query.read = true;
    } else if (filter === "unread") {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.userId, 
      read: false 
    });
    
    return res.status(200).json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
    
  } catch (error) {
    console.error('[GET /notifications] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// POST /notifications/:id/read — mark notification as read
router.post("/:id/read", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({ 
      _id: id, 
      user: req.user.userId 
    });
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    return res.status(200).json({
      message: "Notification marked as read",
      notification
    });
    
  } catch (error) {
    console.error('[POST /notifications/:id/read] Error:', error.message);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// POST /notifications/read-all — mark all notifications as read
router.post("/read-all", authJwt, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    return res.status(200).json({
      message: "All notifications marked as read"
    });
    
  } catch (error) {
    console.error('[POST /notifications/read-all] Error:', error.message);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

// DELETE /notifications/:id — delete notification
router.delete("/:id", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({ 
      _id: id, 
      user: req.user.userId 
    });
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    await Notification.findByIdAndDelete(id);
    
    return res.status(200).json({
      message: "Notification deleted successfully"
    });
    
  } catch (error) {
    console.error('[DELETE /notifications/:id] Error:', error.message);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

// DELETE /notifications — clear all notifications
router.delete("/", authJwt, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.userId });
    
    return res.status(200).json({
      message: "All notifications cleared successfully"
    });
    
  } catch (error) {
    console.error('[DELETE /notifications] Error:', error.message);
    return res.status(500).json({ message: "Failed to clear notifications" });
  }
});

// GET /notifications/count — get unread notification count
router.get("/count", authJwt, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.userId, 
      read: false 
    });
    
    return res.status(200).json({ unreadCount });
    
  } catch (error) {
    console.error('[GET /notifications/count] Error:', error.message);
    return res.status(500).json({ message: "Failed to get notification count" });
  }
});

// Helper function to create notification (used by other routes)
const createNotification = async (userId, title, body, type, data = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      body,
      type,
      data
    });
    
    await notification.save();
    console.log(`[notifications] Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error(`[notifications] Failed to create notification:`, error.message);
    return null;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
