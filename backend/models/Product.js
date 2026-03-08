const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productType: { type: String, enum: ["shop", "resell"], default: "shop", index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    richDescription: { type: String, default: "" },
    image: { type: String, default: "" },
    images: [{ type: String }],
    price: { type: Number, required: true, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    countInStock: { type: Number, required: true, default: 0 },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dateCreated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

productSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

productSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Product", productSchema);
