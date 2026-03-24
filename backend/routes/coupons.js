const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const authJwt = require("../middleware/authJwt");
const { sendToTokens } = require("../services/notifications");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// GET /coupons — get all coupons (admin only)
router.get("/", authJwt, requireAdmin, async (req, res) => {
  try {
    console.log('[GET /coupons] Fetching all coupons');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || ""; // active, expired, upcoming
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    const now = new Date();
    
    if (status === "active") {
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === "expired") {
      query.endDate = { $lt: now };
    } else if (status === "upcoming") {
      query.startDate = { $gt: now };
    }
    
    console.log(`[GET /coupons] Query:`, query);
    
    const coupons = await Coupon.find(query)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`[GET /coupons] Found ${coupons.length} coupons`);
    coupons.forEach(coupon => {
      console.log(`[GET /coupons] - Coupon: ${coupon.code} (${coupon._id})`);
    });
    
    const total = await Coupon.countDocuments(query);
    
    return res.status(200).json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[GET /coupons] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch coupons" });
  }
});

// POST /coupons — create new coupon (admin only)
router.post("/", authJwt, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      type,
      value,
      minAmount,
      maxDiscount,
      applicableProducts,
      applicableCategories,
      usageLimit,
      usageLimitPerUser,
      startDate,
      endDate,
      sendNotification = false
    } = req.body;
    
    // Validation
    if (!code || !title || !description || !type || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    if (type !== "free_shipping" && (value === undefined || value < 0)) {
      return res.status(400).json({ message: "Invalid discount value" });
    }
    
    // Additional validation for percentage type
    if (type === "percentage" && value > 100) {
      return res.status(400).json({ message: "Percentage discount cannot exceed 100%" });
    }
    
    // Handle date parsing - accept both string and Date formats
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    if (start >= end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    
    const coupon = new Coupon({
      code: code.toUpperCase(),
      title,
      description,
      type,
      value,
      minAmount: minAmount || 0,
      maxDiscount,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      usageLimit,
      usageLimitPerUser,
      startDate: start,
      endDate: end,
      createdBy: req.user.userId
    });
    
    await coupon.save();
    
    // Send push notification if requested
    if (sendNotification) {
      try {
        const users = await User.find({ 
          isBanned: false, 
          isDisabled: false 
        }, "pushToken pushTokenType pushTokens").lean();
        
        const userTokens = users.flatMap(user => User.collectActivePushTargets(user));
        
        if (userTokens.length > 0) {
          await sendToTokens(userTokens, {
            title: '🎉 New Coupon Available!',
            body: `${title}: ${description}`,
            data: {
              couponId: coupon.id,
              type: 'coupon',
              action: 'view_coupon',
              applicableProducts: applicableProducts || [],
              applicableCategories: applicableCategories || []
            },
          });
          console.log(`[coupons] Coupon notification sent to ${userTokens.length} users`);
        }
      } catch (notifError) {
        console.error(`[coupons] Failed to send notification:`, notifError.message);
      }
    }
    
    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email");
    
    return res.status(201).json({
      message: "Coupon created successfully",
      coupon: populatedCoupon
    });
    
  } catch (error) {
    console.error('[POST /coupons] Error:', error.message);
    return res.status(500).json({ message: "Failed to create coupon" });
  }
});

// PUT /coupons/:id — update coupon (admin only)
router.put("/:id", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    // If updating code, check for duplicates
    if (updateData.code && updateData.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ 
        code: updateData.code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingCoupon) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
      updateData.code = updateData.code.toUpperCase();
    }
    
    // Handle date parsing for updates
    if (updateData.startDate) {
      const start = new Date(updateData.startDate);
      if (!isNaN(start.getTime())) {
        updateData.startDate = start;
      }
    }
    
    if (updateData.endDate) {
      const end = new Date(updateData.endDate);
      if (!isNaN(end.getTime())) {
        updateData.endDate = end;
      }
    }
    
    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate) {
      if (updateData.startDate >= updateData.endDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
    }
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== "createdBy" && key !== "usedCount" && key !== "userUsage") {
        coupon[key] = updateData[key];
      }
    });
    
    coupon.updatedAt = new Date();
    await coupon.save();
    
    const updatedCoupon = await Coupon.findById(id)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email");
    
    return res.status(200).json({
      message: "Coupon updated successfully",
      coupon: updatedCoupon
    });
    
  } catch (error) {
    console.error('[PUT /coupons/:id] Error:', error.message);
    return res.status(500).json({ message: "Failed to update coupon" });
  }
});

// DELETE /coupons/:id — delete coupon (admin only)
router.delete("/:id", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /coupons/${id}] Delete request received`);
    console.log(`[DELETE /coupons/${id}] User ID: ${req.user.userId}`);
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      console.log(`[DELETE /coupons/${id}] Coupon not found`);
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    console.log(`[DELETE /coupons/${id}] Found coupon:`, coupon.code);
    
    await Coupon.findByIdAndDelete(id);
    console.log(`[DELETE /coupons/${id}] Coupon deleted from database`);
    
    // Verify deletion
    const deletedCoupon = await Coupon.findById(id);
    if (deletedCoupon) {
      console.log(`[DELETE /coupons/${id}] ERROR: Coupon still exists after deletion!`);
    } else {
      console.log(`[DELETE /coupons/${id}] Confirmed: Coupon no longer exists`);
    }
    
    return res.status(200).json({
      message: "Coupon deleted successfully"
    });
    
  } catch (error) {
    console.error('[DELETE /coupons/:id] Error:', error.message);
    return res.status(500).json({ message: "Failed to delete coupon" });
  }
});

// POST /coupons/validate — validate coupon for user
router.post("/validate", authJwt, async (req, res) => {
  try {
    const { code, orderAmount, productIds = [] } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }
    
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    })
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name");
    
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    // Check if user can use this coupon
    const canUseResult = await coupon.canBeUsedByUser(req.user.userId);
    if (!canUseResult.canUse) {
      return res.status(400).json({ 
        message: canUseResult.reason,
        valid: false
      });
    }
    
    // Calculate discount
    const discount = coupon.calculateDiscount(orderAmount, productIds);
    
    return res.status(200).json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount,
        discount: discount
      }
    });
    
  } catch (error) {
    console.error('[POST /coupons/validate] Error:', error.message);
    return res.status(500).json({ message: "Failed to validate coupon" });
  }
});

// POST /coupons/apply — apply coupon to order
router.post("/apply", authJwt, async (req, res) => {
  try {
    const { code, orderAmount, productIds = [] } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }
    
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });
    
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    // Check if user can use this coupon
    const canUseResult = await coupon.canBeUsedByUser(req.user.userId);
    if (!canUseResult.canUse) {
      return res.status(400).json({ 
        message: canUseResult.reason,
        applied: false
      });
    }
    
    // Calculate discount
    const discount = coupon.calculateDiscount(orderAmount, productIds);
    
    if (discount <= 0) {
      return res.status(400).json({ 
        message: "Coupon cannot be applied to this order",
        applied: false
      });
    }
    
    // Record usage
    await coupon.recordUsage(req.user.userId);
    
    return res.status(200).json({
      applied: true,
      discount: discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        value: coupon.value
      }
    });
    
  } catch (error) {
    console.error('[POST /coupons/apply] Error:', error.message);
    return res.status(500).json({ message: "Failed to apply coupon" });
  }
});

// GET /coupons/active — get active coupons for customers
router.get("/active", async (req, res) => {
try {
  const now = new Date();

  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
    .populate("applicableProducts", "name price image")
    .populate("applicableCategories", "name")
    .sort({ createdAt: -1 });

  return res.status(200).json({ coupons });

} catch (error) {
console.error('[GET /coupons/active] Error:', error.message);
return res.status(500).json({ message: "Failed to fetch active coupons" });
}
});

// POST /coupons/claim — claim a coupon for user
router.post("/claim", authJwt, async (req, res) => {
  try {
    const { couponId } = req.body;
    const userId = req.user.userId;
    
    if (!couponId) {
      return res.status(400).json({ message: "Coupon ID is required" });
    }
    
    // Find the coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    // Check if coupon is active
    if (!coupon.isCurrentlyActive) {
      return res.status(400).json({ message: "Coupon is not active" });
    }
    
    // Get user
    const User = require("../models/User");
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if already claimed
    if (user.claimedCoupons.includes(couponId)) {
      return res.status(400).json({ message: "Coupon already claimed" });
    }
    
    // Add coupon to user's claimed coupons
    user.claimedCoupons.push(couponId);
    await user.save();
    
    return res.status(200).json({
      message: "Coupon claimed successfully",
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount,
        endDate: coupon.endDate
      }
    });
    
  } catch (error) {
    console.error('[POST /coupons/claim] Error:', error.message);
    return res.status(500).json({ message: "Failed to claim coupon" });
  }
});

// GET /coupons/claimed — get user's claimed coupons
router.get("/claimed", authJwt, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const User = require("../models/User");
    const user = await User.findById(userId).populate("claimedCoupons");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Filter to only include active claimed coupons
    const claimedCoupons = user.claimedCoupons.filter(coupon => {
      return coupon.isCurrentlyActive;
    });
    
    return res.status(200).json({
      coupons: claimedCoupons
    });
    
  } catch (error) {
    console.error('[GET /coupons/claimed] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch claimed coupons" });
  }
});

// POST /coupons/:id/notify — send coupon notification to users (admin only)
router.post("/:id/notify", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[POST /coupons/${id}/notify] Starting notification send`);
    
    const coupon = await Coupon.findById(id)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name");
    
    if (!coupon) {
      console.log(`[POST /coupons/${id}/notify] Coupon not found`);
      return res.status(404).json({ message: "Coupon not found" });
    }
    console.log(`[POST /coupons/${id}/notify] Found coupon: ${coupon.title}`);
    
    if (!coupon.isCurrentlyActive) {
      console.log(`[POST /coupons/${id}/notify] Coupon not active`);
      return res.status(400).json({ message: "Coupon is not currently active" });
    }
    
    const users = await User.find({ 
      isBanned: false, 
      isDisabled: false 
    }, "pushToken pushTokenType pushTokens").lean();
    console.log(`[POST /coupons/${id}/notify] Found ${users.length} users`);
    
    const userTokens = users.flatMap(user => User.collectActivePushTargets(user));
    console.log(`[POST /coupons/${id}/notify] Collected ${userTokens.length} push tokens`);
    console.log(`[POST /coupons/${id}/notify] Tokens:`, userTokens.map(t => typeof t === 'object' ? {token: t.token?.substring(0,20)+'...', type: t.type} : t.substring(0,20)+'...'));
    
    if (userTokens.length === 0) {
      console.log(`[POST /coupons/${id}/notify] No users with push tokens`);
      return res.status(400).json({ message: "No users available for notifications" });
    }
    
    console.log(`[POST /coupons/${id}/notify] Calling sendToTokens...`);
    await sendToTokens(userTokens, {
      title: '🎫 New Coupon Available!',
      body: `${coupon.title}: ${coupon.description}`,
      data: {
        couponId: coupon.id,
        type: 'coupon',
        action: 'view_coupon',
        applicableProducts: coupon.applicableProducts.map(p => p.id),
        applicableCategories: coupon.applicableCategories.map(c => c.id)
      },
    });
    
    console.log(`[POST /coupons/${id}/notify] Notification sent successfully to ${userTokens.length} users`);
    
    return res.status(200).json({
      message: `Coupon notification sent to ${userTokens.length} users`,
      notifiedUsers: userTokens.length
    });
    
  } catch (error) {
    console.error('[POST /coupons/:id/notify] Error:', error.message);
    console.error('[POST /coupons/:id/notify] Stack:', error.stack);
    return res.status(500).json({ message: "Failed to send coupon notification" });
  }
});

module.exports = router;
