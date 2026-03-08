const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    color: { type: String, default: "#333" },
    icon: { type: String, default: "" },
  },
  { timestamps: true }
);

categorySchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

categorySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Category", categorySchema);
