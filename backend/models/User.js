const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, trim: true },
    type: { type: String, enum: ["fcm", "expo", "unknown"], default: "unknown" },
    lastSeenAt: { type: Date, default: Date.now },
    invalidatedAt: { type: Date, default: null },
    invalidReason: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: "" },
    phone: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    authProvider: { type: String, enum: ["local", "google", "facebook"], default: "local" },
    providerId: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: "" },
    emailVerificationExpiresAt: { type: Date, default: null },
    deliveryAddress1: { type: String, default: "" },
    deliveryAddress2: { type: String, default: "" },
    deliveryCity: { type: String, default: "" },
    deliveryZip: { type: String, default: "" },
    deliveryCountry: { type: String, default: "Philippines" },
    deliveryLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    pushToken: { type: String, default: "" },
    pushTokenType: { type: String, enum: ["fcm", "expo", "unknown", ""], default: "" },
    pushTokens: { type: [pushTokenSchema], default: [] },
    walletBalance: { type: Number, default: 0, min: 0 },
    walletLastUpdatedAt: { type: Date, default: null },
    // Admin management fields
    isBanned: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    warnings: [{
      reason: { type: String, required: true },
      message: { type: String, required: true },
      severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    banInfo: {
      reason: { type: String },
      permanent: { type: Boolean, default: false },
      duration: { type: Number }, // days
      bannedAt: { type: Date },
      expiresAt: { type: Date },
      bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    disableInfo: {
      reason: { type: String },
      disabledAt: { type: Date },
      disabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    claimedCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

function normalizePushTokenType(token, type) {
  if (type === "expo" || type === "fcm" || type === "unknown") {
    return type;
  }
  if (typeof token === "string" && token.startsWith("ExponentPushToken")) {
    return "expo";
  }
  return "fcm";
}

userSchema.statics.normalizePushTokenType = normalizePushTokenType;

userSchema.statics.collectActivePushTargets = function collectActivePushTargets(userDoc) {
  const targets = [];
  const seen = new Set();

  const activeTokens = Array.isArray(userDoc?.pushTokens)
    ? userDoc.pushTokens.filter((entry) => entry?.token && !entry?.invalidatedAt)
    : [];

  for (const entry of activeTokens) {
    const token = String(entry.token);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    targets.push({ token, type: normalizePushTokenType(token, entry.type) });
  }

  // Backward compatibility for legacy single-token users.
  if (userDoc?.pushToken) {
    const token = String(userDoc.pushToken);
    if (token && !seen.has(token)) {
      targets.push({ token, type: normalizePushTokenType(token, userDoc.pushTokenType) });
    }
  }

  return targets;
};

userSchema.statics.removeInvalidPushTokens = async function removeInvalidPushTokens(invalidTokens) {
  if (!Array.isArray(invalidTokens) || invalidTokens.length === 0) {
    return { modifiedCount: 0 };
  }

  const uniqueTokens = [...new Set(invalidTokens.filter(Boolean).map((token) => String(token)))];
  if (uniqueTokens.length === 0) {
    return { modifiedCount: 0 };
  }

  const now = new Date();

  await this.updateMany(
    { "pushTokens.token": { $in: uniqueTokens } },
    {
      $set: {
        "pushTokens.$[entry].invalidatedAt": now,
        "pushTokens.$[entry].invalidReason": "DeviceNotRegistered",
      },
    },
    {
      arrayFilters: [{ "entry.token": { $in: uniqueTokens } }],
    }
  );

  const legacy = await this.updateMany(
    { pushToken: { $in: uniqueTokens } },
    { $set: { pushToken: "", pushTokenType: "" } }
  );

  return { modifiedCount: Number(legacy?.modifiedCount || 0) };
};

userSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    delete ret.emailVerificationTokenHash;
    delete ret.pushToken;
    delete ret.pushTokenType;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
