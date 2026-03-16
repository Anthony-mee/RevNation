const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    richDescription: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true, default: 0 },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    duration: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dateCreated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

serviceSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

serviceSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Service", serviceSchema);