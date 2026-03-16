const mongoose = require("mongoose");

const reviewCommentSchema = new mongoose.Schema(
  {
    text: { type: String, default: "", trim: true, maxlength: 1000 },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

reviewCommentSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

reviewCommentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["product", "service"], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 1000 },
    image: { type: String, default: "" },
    comments: [reviewCommentSchema],
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

reviewSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

reviewSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Review", reviewSchema);