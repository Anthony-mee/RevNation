const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ["percentage", "fixed", "buy_one_get_one", "free_shipping"], 
      required: true 
    },
    value: { 
      type: Number, 
      required: function() {
        return this.type !== "buy_one_get_one" && this.type !== "free_shipping";
      },
      min: 0
    },
    minAmount: { type: Number, default: 0, min: 0 }, // Minimum order amount
    maxDiscount: { type: Number, min: 0 }, // Maximum discount amount
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    usageLimit: { type: Number, min: 1 }, // Total usage limit
    usageLimitPerUser: { type: Number, min: 1 }, // Per user limit
    usedCount: { type: Number, default: 0 },
    userUsage: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      usageCount: { type: Number, default: 1 },
      firstUsedAt: { type: Date, default: Date.now },
      lastUsedAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Virtual to check if promotion is currently active
promotionSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate && 
         (!this.usageLimit || this.usedCount < this.usageLimit);
});

// Virtual to check if promotion has expired
promotionSchema.virtual("isExpired").get(function () {
  return new Date() > this.endDate || (this.usageLimit && this.usedCount >= this.usageLimit);
});

// Virtual to check if promotion is upcoming
promotionSchema.virtual("isUpcoming").get(function () {
  return new Date() < this.startDate;
});

// Method to check if promotion can be used by a specific user
promotionSchema.methods.canBeUsedByUser = async function (userId) {
  if (!this.isCurrentlyActive) return { canUse: false, reason: "Promotion is not active" };
  
  // Check usage limit per user
  if (this.usageLimitPerUser) {
    const userUsage = this.userUsage.find(u => u.user.toString() === userId.toString());
    if (userUsage && userUsage.usageCount >= this.usageLimitPerUser) {
      return { canUse: false, reason: "Usage limit per user exceeded" };
    }
  }
  
  return { canUse: true };
};

// Method to record promotion usage
promotionSchema.methods.recordUsage = async function (userId) {
  this.usedCount += 1;
  
  let userUsage = this.userUsage.find(u => u.user.toString() === userId.toString());
  if (userUsage) {
    userUsage.usageCount += 1;
    userUsage.lastUsedAt = new Date();
  } else {
    this.userUsage.push({
      user: userId,
      usageCount: 1,
      firstUsedAt: new Date(),
      lastUsedAt: new Date()
    });
  }
  
  await this.save();
};

// Method to check if promotion is applicable to products
promotionSchema.methods.isApplicableToProducts = function (productIds) {
  if (this.applicableProducts.length === 0 && this.applicableCategories.length === 0) {
    return true; // Applies to all products
  }
  
  return productIds.some(productId => 
    this.applicableProducts.some(id => id.toString() === productId.toString())
  );
};

// Method to calculate discount amount
promotionSchema.methods.calculateDiscount = function (orderAmount, productIds = []) {
  if (!this.isCurrentlyActive) return 0;
  
  // Check minimum amount requirement
  if (orderAmount < this.minAmount) return 0;
  
  // Check if applicable to products
  if (!this.isApplicableToProducts(productIds)) return 0;
  
  let discount = 0;
  
  switch (this.type) {
    case "percentage":
      discount = orderAmount * (this.value / 100);
      if (this.maxDiscount) {
        discount = Math.min(discount, this.maxDiscount);
      }
      break;
    case "fixed":
      discount = Math.min(this.value, orderAmount);
      break;
    case "free_shipping":
      // This would be handled separately in shipping calculation
      discount = 0;
      break;
    case "buy_one_get_one":
      // This would require special handling in cart logic
      discount = 0;
      break;
  }
  
  return discount;
};

promotionSchema.virtual("id").get(function () {
  return this._id.toString();
});

promotionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Promotion", promotionSchema);
