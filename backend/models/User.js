const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

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
