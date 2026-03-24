/**
 * Admin Management Routes
 * User management, warnings, bans, and push notifications
 */

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authJwt = require("../middleware/authJwt");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { sendToTokens } = require("../services/notifications");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Test route - no auth required
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes are working", timestamp: new Date().toISOString() });
});

// GET /admin/users — get all users with pagination and search
router.get("/users", authJwt, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || ""; // active, banned, disabled
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    if (status === "banned") {
      query.isBanned = true;
    } else if (status === "disabled") {
      query.isDisabled = true;
    } else if (status === "active") {
      query.isBanned = false;
      query.isDisabled = false;
    }
    
    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(query);
    
    return res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[GET /admin/users] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /admin/users/:userId/warn — send warning to user
router.post("/users/:userId/warn", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, message, severity } = req.body;
    
    if (!reason || !message) {
      return res.status(400).json({ message: "Reason and message are required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Add warning to user record
    if (!user.warnings) {
      user.warnings = [];
    }
    
    user.warnings.push({
      reason,
      message,
      severity: severity || 'medium', // low, medium, high
      createdAt: new Date(),
      createdBy: req.user.userId
    });
    
    await user.save();
    
    // Send push notification to user
    if (user.pushTokens && user.pushTokens.length > 0) {
      try {
        await sendToTokens(user.pushTokens, {
          title: `⚠️ ${severity === 'high' ? 'URGENT' : 'Warning'} from Admin`,
          body: message,
          data: {
            type: 'admin_warning',
            severity: severity,
            userId: userId,
            action: 'view_warnings'
          }
        });
        console.log(`[POST /admin/users/${userId}/warn] Warning notification sent to user ${userId}`);
      } catch (notifError) {
        console.error(`[POST /admin/users/${userId}/warn] Push notification failed:`, notifError.message);
      }
    }
    
    console.log(`[POST /admin/users/${userId}/warn] User ${userId} warned: ${reason}`);
    
    return res.status(200).json({
      message: "Warning sent successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        warningsCount: user.warnings.length
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/warn] Error:', error.message);
    return res.status(500).json({ message: "Failed to send warning" });
  }
});

// POST /admin/users/:userId/ban — ban user
router.post("/users/:userId/ban", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, permanent, duration } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: "Ban reason is required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user is already banned
    if (user.isBanned) {
      return res.status(400).json({ message: "User is already banned" });
    }
    
    // Update user status
    user.isBanned = true;
    user.banInfo = {
      reason,
      permanent: permanent || false,
      duration: duration || 30, // days
      bannedAt: new Date(),
      bannedBy: req.user.userId
    };
    
    // Calculate ban expiry if not permanent
    if (!permanent) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (duration || 30));
      user.banInfo.expiresAt = expiryDate;
    }
    
    await user.save();
    
    // Send push notification
    if (user.pushTokens && user.pushTokens.length > 0) {
      try {
        await sendToTokens(user.pushTokens, {
          title: '🚫 Account Banned',
          body: permanent ? 
            `Your account has been permanently banned. Reason: ${reason}` :
            `Your account has been temporarily banned for ${duration || 30} days. Reason: ${reason}`,
          data: {
            type: 'account_banned',
            permanent: permanent || false,
            userId: userId,
            action: 'view_account_status'
          }
        });
        console.log(`[POST /admin/users/${userId}/ban] Ban notification sent to user ${userId}`);
      } catch (notifError) {
        console.error(`[POST /admin/users/${userId}/ban] Push notification failed:`, notifError.message);
      }
    }
    
    console.log(`[POST /admin/users/${userId}/ban] User ${userId} banned: ${reason}`);
    
    return res.status(200).json({
      message: "User banned successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBanned: true,
        banInfo: user.banInfo
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/ban] Error:', error.message);
    return res.status(500).json({ message: "Failed to ban user" });
  }
});

// POST /admin/users/:userId/unban — unban user
router.post("/users/:userId/unban", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, message } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user is not banned
    if (!user.isBanned) {
      return res.status(400).json({ message: "User is not banned" });
    }
    
    // Update user status
    user.isBanned = false;
    user.banInfo = {
      ...user.banInfo,
      unbannedAt: new Date(),
      unbannedBy: req.user.userId,
      unbanReason: reason || "Admin discretion"
    };
    
    await user.save();
    
    // Send push notification
    if (user.pushTokens && user.pushTokens.length > 0) {
      try {
        await sendToTokens(user.pushTokens, {
          title: '✅ Account Unbanned',
          body: message || `Your account has been unbanned by the admin. Reason: ${reason || "Admin discretion"}`,
          data: {
            type: 'account_unbanned',
            userId: userId,
            action: 'view_account_status'
          }
        });
        console.log(`[POST /admin/users/${userId}/unban] Unban notification sent to user ${userId}`);
      } catch (notifError) {
        console.error(`[POST /admin/users/${userId}/unban] Push notification failed:`, notifError.message);
      }
    }
    
    console.log(`[POST /admin/users/${userId}/unban] User ${userId} unbanned: ${reason}`);
    
    return res.status(200).json({
      message: "User unbanned successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBanned: false,
        banInfo: user.banInfo
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/unban] Error:', error.message);
    return res.status(500).json({ message: "Failed to unban user" });
  }
});

// POST /admin/users/:userId/disable — disable user
router.post("/users/:userId/disable", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: "Disable reason is required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user is already disabled
    if (user.isDisabled) {
      return res.status(400).json({ message: "User is already disabled" });
    }
    
    // Update user status
    user.isDisabled = true;
    user.disableInfo = {
      reason,
      disabledAt: new Date(),
      disabledBy: req.user.userId
    };
    
    await user.save();
    
    // Send push notification
    if (user.pushTokens && user.pushTokens.length > 0) {
      const notification = {
        to: user.pushTokens.map(token => token.token),
        sound: 'default',
        title: '⏸️ Account Disabled',
        body: `Your account has been temporarily disabled. Reason: ${reason}`,
        data: {
          type: 'account_disabled',
          userId: userId,
          action: 'view_account_status'
        },
        priority: 'high'
      };
      
      console.log(`[POST /admin/users/${userId}/disable] Disable notification sent to user ${userId}`);
      // TODO: Implement actual push notification sending via FCM/Expo
    }
    
    console.log(`[POST /admin/users/${userId}/disable] User ${userId} disabled: ${reason}`);
    
    return res.status(200).json({
      message: "User disabled successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isDisabled: true,
        disableInfo: user.disableInfo
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/disable] Error:', error.message);
    return res.status(500).json({ message: "Failed to disable user" });
  }
});

// POST /admin/users/:userId/enable — re-enable user
router.post("/users/:userId/enable", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user status
    user.isBanned = false;
    user.isDisabled = false;
    user.banInfo = null;
    user.disableInfo = null;
    
    await user.save();
    
    // Send push notification
    if (user.pushTokens && user.pushTokens.length > 0) {
      const notification = {
        to: user.pushTokens.map(token => token.token),
        sound: 'default',
        title: '✅ Account Re-enabled',
        body: reason || `Your account has been re-enabled. You can now use all features.`,
        data: {
          type: 'account_reenabled',
          userId: userId,
          action: 'view_account'
        },
        priority: 'normal'
      };
      
      console.log(`[POST /admin/users/${userId}/enable] Re-enable notification sent to user ${userId}`);
      // TODO: Implement actual push notification sending via FCM/Expo
    }
    
    console.log(`[POST /admin/users/${userId}/enable] User ${userId} re-enabled`);
    
    return res.status(200).json({
      message: "User re-enabled successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBanned: false,
        isDisabled: false
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/enable] Error:', error.message);
    return res.status(500).json({ message: "Failed to re-enable user" });
  }
});

// GET /admin/users/:userId — get user details
router.get("/users/:userId", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select("-passwordHash")
      .populate('warnings.createdBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        isDisabled: user.isDisabled,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLoginAt,
        warnings: user.warnings || [],
        banInfo: user.banInfo,
        disableInfo: user.disableInfo,
        pushTokens: user.pushTokens || [],
        stats: {
          totalOrders: 0, // TODO: Add order counting
          totalSpent: 0, // TODO: Add spending calculation
          joinDate: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('[GET /admin/users/:userId] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch user details" });
  }
});

// POST /admin/users/:userId/promote — promote user to admin
router.post("/users/:userId/promote", authJwt, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user is already admin
    if (user.isAdmin) {
      return res.status(400).json({ message: "User is already an admin" });
    }
    
    // Promote user to admin
    user.isAdmin = true;
    await user.save();
    
    // Send push notification
    if (user.pushTokens && user.pushTokens.length > 0) {
      const notification = {
        to: user.pushTokens.map(token => token.token),
        sound: 'default',
        title: '🎉 Congratulations!',
        body: reason || `You have been promoted to admin. You now have access to admin features.`,
        data: {
          type: 'admin_promotion',
          userId: userId,
          action: 'view_admin_panel'
        },
        priority: 'high'
      };
      
      console.log(`[POST /admin/users/${userId}/promote] Promotion notification sent to user ${userId}`);
      // TODO: Implement actual push notification sending via FCM/Expo
    }
    
    console.log(`[POST /admin/users/${userId}/promote] User ${userId} promoted to admin`);
    
    return res.status(200).json({
      message: "User promoted to admin successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: true
      }
    });
    
  } catch (error) {
    console.error('[POST /admin/users/:userId/promote] Error:', error.message);
    return res.status(500).json({ message: "Failed to promote user" });
  }
});

// POST /admin/notifications/broadcast — send notification to all users
router.post("/notifications/broadcast", authJwt, requireAdmin, async (req, res) => {
  try {
    const { title, message, type, targetUsers } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    
    // Build query for target users
    let userQuery = {};
    if (targetUsers === "active") {
      userQuery = { isBanned: false, isDisabled: false };
    } else if (targetUsers === "verified") {
      userQuery = { isBanned: false, isDisabled: false, isVerified: true };
    }
    
    const users = await User.find(userQuery);
    const totalTokens = [];
    const notificationPromises = [];
    
    for (const user of users) {
      if (user.pushTokens && user.pushTokens.length > 0) {
        totalTokens.push(...user.pushTokens.map(t => t.token));
        
        // Create individual notification payload
        const notification = {
          to: user.pushTokens.map(token => token.token),
          sound: 'default',
          title,
          body: message,
          data: {
            type: type || 'admin_broadcast',
            userId: user._id,
            action: 'view_app'
          },
          priority: 'high'
        };
        
        notificationPromises.push({
          userId: user._id,
          notification
        });
      }
    }
    
    console.log(`[POST /admin/notifications/broadcast] Broadcasting to ${notificationPromises.length} users with ${totalTokens.length} tokens`);
    
    // TODO: Implement actual push notification sending via FCM/Expo
    
    return res.status(200).json({
      message: "Broadcast notification sent successfully",
      stats: {
        totalUsers: users.length,
        usersWithTokens: notificationPromises.length,
        totalTokens: totalTokens.length,
        type: type || 'admin_broadcast'
      },
      notifications: notificationPromises
    });
    
  } catch (error) {
    console.error('[POST /admin/notifications/broadcast] Error:', error.message);
    return res.status(500).json({ message: "Failed to send broadcast" });
  }
});

module.exports = router;
