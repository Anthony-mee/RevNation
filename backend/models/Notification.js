const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ["order_confirmed", "order_status_update", "new_order", "promotion", "discount", "account_banned", "account_unbanned", "warning"], 
      required: true 
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Virtual to check if notification is recent (within 24 hours)
notificationSchema.virtual("isRecent").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  return diff < (24 * 60 * 60 * 1000); // 24 hours in milliseconds
});

notificationSchema.virtual("id").get(function () {
  return this._id.toString();
});

notificationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
