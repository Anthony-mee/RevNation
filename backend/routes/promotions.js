const express = require("express");
const router = express.Router();
const Promotion = require("../models/Promotion");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const authJwt = require("../middleware/authJwt");
const { sendToTokens } = require("../services/notifications");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// GET /promotions — get all promotions (admin only)
router.get("/", authJwt, requireAdmin, async (req, res) => {
  try {
    console.log('[GET /promotions] Fetching all promotions');
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
    
    console.log(`[GET /promotions] Query:`, query);
    
    const promotions = await Promotion.find(query)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`[GET /promotions] Found ${promotions.length} promotions`);
    promotions.forEach(promotion => {
      console.log(`[GET /promotions] - Promotion: ${promotion.title} (${promotion._id})`);
    });
    
    const total = await Promotion.countDocuments(query);
    
    return res.status(200).json({
      promotions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[GET /promotions] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch promotions" });
  }
});

// POST /promotions — create new promotion (admin only)
router.post("/", authJwt, requireAdmin, async (req, res) => {
  try {
    const {
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
    if (!title || !description || !type || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    if (type !== "buy_one_get_one" && type !== "free_shipping" && (value === undefined || value < 0)) {
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
    
    const promotion = new Promotion({
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
    
    await promotion.save();
    
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
            title: '🎉 New Promotion Available!',
            body: `${title}: ${description}`,
            data: {
              promotionId: promotion.id,
              type: 'promotion',
              action: 'view_promotion',
              applicableProducts: applicableProducts || [],
              applicableCategories: applicableCategories || []
            },
          });
          console.log(`[promotions] Promotion notification sent to ${userTokens.length} users`);
        }
      } catch (notifError) {
        console.error(`[promotions] Failed to send notification:`, notifError.message);
      }
    }
    
    const populatedPromotion = await Promotion.findById(promotion._id)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email");
    
    return res.status(201).json({
      message: "Promotion created successfully",
      promotion: populatedPromotion
    });
    
  } catch (error) {
    console.error('[POST /promotions] Error:', error.message);
    return res.status(500).json({ message: "Failed to create promotion" });
  }
});

// PUT /promotions/:id — update promotion (admin only)
router.put("/:id", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
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
        promotion[key] = updateData[key];
      }
    });
    
    promotion.updatedAt = new Date();
    await promotion.save();
    
    const updatedPromotion = await Promotion.findById(id)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email");
    
    return res.status(200).json({
      message: "Promotion updated successfully",
      promotion: updatedPromotion
    });
    
  } catch (error) {
    console.error('[PUT /promotions/:id] Error:', error.message);
    return res.status(500).json({ message: "Failed to update promotion" });
  }
});

// DELETE /promotions/:id — delete promotion (admin only)
router.delete("/:id", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /promotions/${id}] Delete request received`);
    console.log(`[DELETE /promotions/${id}] User ID: ${req.user.userId}`);
    
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      console.log(`[DELETE /promotions/${id}] Promotion not found`);
      return res.status(404).json({ message: "Promotion not found" });
    }
    
    console.log(`[DELETE /promotions/${id}] Found promotion:`, promotion.title);
    
    await Promotion.findByIdAndDelete(id);
    console.log(`[DELETE /promotions/${id}] Promotion deleted from database`);
    
    // Verify deletion
    const deletedPromotion = await Promotion.findById(id);
    if (deletedPromotion) {
      console.log(`[DELETE /promotions/${id}] ERROR: Promotion still exists after deletion!`);
    } else {
      console.log(`[DELETE /promotions/${id}] Confirmed: Promotion no longer exists`);
    }
    
    return res.status(200).json({
      message: "Promotion deleted successfully"
    });
    
  } catch (error) {
    console.error('[DELETE /promotions/:id] Error:', error.message);
    return res.status(500).json({ message: "Failed to delete promotion" });
  }
});

// POST /promotions/:id/notify — send promotion notification to users (admin only)
router.post("/:id/notify", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const promotion = await Promotion.findById(id)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name");
    
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    
    if (!promotion.isCurrentlyActive) {
      return res.status(400).json({ message: "Promotion is not currently active" });
    }
    
    const users = await User.find({ 
      isBanned: false, 
      isDisabled: false 
    }, "pushToken pushTokenType pushTokens").lean();
    
    const userTokens = users.flatMap(user => User.collectActivePushTargets(user));
    
    if (userTokens.length === 0) {
      return res.status(400).json({ message: "No users available for notifications" });
    }
    
    await sendToTokens(userTokens, {
      title: '🔥 Hot Deal Available!',
      body: `${promotion.title}: ${promotion.description}`,
      data: {
        promotionId: promotion.id,
        type: 'promotion',
        action: 'view_promotion',
        applicableProducts: promotion.applicableProducts.map(p => p.id),
        applicableCategories: promotion.applicableCategories.map(c => c.id)
      },
    });
    
    console.log(`[promotions] Promotion notification sent to ${userTokens.length} users`);
    
    return res.status(200).json({
      message: `Promotion notification sent to ${userTokens.length} users`,
      notifiedUsers: userTokens.length
    });
    
  } catch (error) {
    console.error('[POST /promotions/:id/notify] Error:', error.message);
    return res.status(500).json({ message: "Failed to send promotion notification" });
  }
});

// GET /promotions/active — get active promotions for customers
router.get("/active", async (req, res) => {
  try {
    const now = new Date();
    
    // Get active promotions
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance
    
    // Get active coupons
    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance
    
    // Manually add virtual properties and ensure proper date formatting for promotions
    const promotionsWithVirtuals = promotions.map(promo => {
      const startDate = promo.startDate ? new Date(promo.startDate) : null;
      const endDate = promo.endDate ? new Date(promo.endDate) : null;
      
      return {
        ...promo,
        id: promo._id.toString(),
        startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString() : new Date().toISOString(),
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isCurrentlyActive: promo.isActive && startDate && endDate && now >= startDate && now <= endDate && 
                           (!promo.usageLimit || promo.usedCount < promo.usageLimit),
        isExpired: endDate && (now > endDate || (promo.usageLimit && promo.usedCount >= promo.usageLimit)),
        isUpcoming: startDate && now < startDate,
        source: 'promotion'
      };
    });
    
    // Convert coupons to promotion-like format
    const couponsAsPromotions = coupons.map(coupon => {
      const startDate = coupon.startDate ? new Date(coupon.startDate) : null;
      const endDate = coupon.endDate ? new Date(coupon.endDate) : null;
      
      return {
        ...coupon,
        id: coupon._id.toString(),
        startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString() : new Date().toISOString(),
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isCurrentlyActive: coupon.isActive && startDate && endDate && now >= startDate && now <= endDate && 
                           (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit),
        isExpired: endDate && (now > endDate || (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)),
        isUpcoming: startDate && now < startDate,
        source: 'coupon',
        code: coupon.code // Include coupon code for users to use
      };
    });
    
    // Combine promotions and coupons
    const allPromotions = [...promotionsWithVirtuals, ...couponsAsPromotions];
    
    // Sort by creation date (newest first)
    allPromotions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`[promotions/active] Found ${promotionsWithVirtuals.length} active promotions and ${couponsAsPromotions.length} active coupons (total: ${allPromotions.length})`);
    
    return res.status(200).json({ promotions: allPromotions });
    
  } catch (error) {
    console.error('[GET /promotions/active] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch active promotions" });
  }
});

// POST /promotions/:id/generate-coupon — generate coupon from promotion (admin only)
router.post("/:id/generate-coupon", authJwt, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const promotion = await Promotion.findById(id)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name");
    
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    
    if (!promotion.isCurrentlyActive) {
      return res.status(400).json({ message: "Promotion is not currently active" });
    }
    
    // Generate unique coupon code
    const generateCode = () => {
      const prefix = "PROMO";
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${prefix}${random}`;
    };
    
    let couponCode = generateCode();
    
    // Ensure code is unique
    let attempts = 0;
    while (await Coupon.findOne({ code: couponCode }) && attempts < 10) {
      couponCode = generateCode();
      attempts++;
    }
    
    if (attempts >= 10) {
      return res.status(500).json({ message: "Failed to generate unique coupon code" });
    }
    
    // Create coupon based on promotion
    const coupon = new Coupon({
      code: couponCode,
      title: promotion.title,
      description: promotion.description,
      type: promotion.type === "buy_one_get_one" ? "percentage" : promotion.type, // Convert BOGO to percentage
      value: promotion.type === "buy_one_get_one" ? 50 : promotion.value, // BOGO becomes 50% off
      minAmount: promotion.minAmount,
      maxDiscount: promotion.maxDiscount,
      applicableProducts: promotion.applicableProducts,
      applicableCategories: promotion.applicableCategories,
      usageLimit: promotion.usageLimit,
      usageLimitPerUser: promotion.usageLimitPerUser,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      createdBy: req.user.userId
    });
    
    await coupon.save();
    
    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate("applicableProducts", "name price image")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name email");
    
    console.log(`[promotions] Coupon generated from promotion: ${couponCode}`);
    
    return res.status(201).json({
      message: "Coupon generated successfully",
      coupon: populatedCoupon
    });
    
  } catch (error) {
    console.error('[POST /promotions/:id/generate-coupon] Error:', error.message);
    return res.status(500).json({ message: "Failed to generate coupon" });
  }
});

// POST /promotions/:id/claim-coupon — claim coupon from promotion for user
router.post("/:id/claim-coupon", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    
    if (!promotion.isCurrentlyActive) {
      return res.status(400).json({ message: "Promotion is not active" });
    }
    
    // Check if user already has a claimed coupon for this promotion
    const existingCoupon = await Coupon.findOne({
      title: promotion.title,
      "userUsage.user": userId
    });
    
    if (existingCoupon) {
      return res.status(400).json({ message: "You have already claimed a coupon for this promotion" });
    }
    
    // Generate unique coupon code
    const generateCode = () => {
      const prefix = "CLAIM";
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${prefix}${random}`;
    };
    
    let couponCode = generateCode();
    
    // Ensure code is unique
    let attempts = 0;
    while (await Coupon.findOne({ code: couponCode }) && attempts < 10) {
      couponCode = generateCode();
      attempts++;
    }
    
    if (attempts >= 10) {
      return res.status(500).json({ message: "Failed to generate unique coupon code" });
    }
    
    // Create claimed coupon
    const coupon = new Coupon({
      code: couponCode,
      title: promotion.title,
      description: promotion.description,
      type: promotion.type === "buy_one_get_one" ? "percentage" : promotion.type,
      value: promotion.type === "buy_one_get_one" ? 50 : promotion.value,
      minAmount: promotion.minAmount,
      maxDiscount: promotion.maxDiscount,
      applicableProducts: promotion.applicableProducts,
      applicableCategories: promotion.applicableCategories,
      usageLimit: 1, // Claimed coupons are single use
      usageLimitPerUser: 1,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      createdBy: req.user.userId
    });
    
    await coupon.save();
    
    // Add to user's claimed coupons
    const user = await User.findById(userId);
    if (user && user.claimedCoupons) {
      user.claimedCoupons.push(coupon._id);
      await user.save();
    }
    
    console.log(`[promotions] Coupon claimed by user: ${couponCode}`);
    
    return res.status(201).json({
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
    console.error('[POST /promotions/:id/claim-coupon] Error:', error.message);
    return res.status(500).json({ message: "Failed to claim coupon" });
  }
});

module.exports = router;
