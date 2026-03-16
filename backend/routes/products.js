const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Review = require("../models/Review");
const Order = require("../models/Order");
const StockAlert = require("../models/StockAlert");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");
const config = require("../config");
const {
  getUploadAbsolutePath,
  ensureUploadDirExists,
  buildImageUrl,
  normalizeImageUrl,
} = require("../utils/uploads");

const router = express.Router();

const uploadPath = getUploadAbsolutePath();
ensureUploadDirExists();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const safeBase = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

function uploadSingleImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `Image is too large. Max allowed size is ${config.maxFileSizeMb}MB.`,
      });
    }

    return res.status(400).json({ message: err.message || "Invalid image upload" });
  });
}

const STOCK_LOW_THRESHOLD = 10;

async function notifyAdmins(title, body) {
  try {
    const admins = await User.find({ isAdmin: true }, "pushToken pushTokenType pushTokens").lean();
    const tokens = admins.flatMap((admin) => User.collectActivePushTargets(admin));
    console.log(`[notifyAdmins] Sending to ${tokens.length} admin(s): "${title}"`);
    await sendToTokens(tokens, { title, body });
  } catch (error) {
    console.error('[notifyAdmins] Error:', error.message);
  }
}

async function updateStockAlerts(product) {
  const count = Number(product.countInStock || 0);
  const productId = product._id;
  const productName = product.name || "Product";

  if (count <= 0) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "low" },
      { resolved: true }
    );
    const existingOut = await StockAlert.findOne({ product: productId, resolved: false, type: "out" });
    if (!existingOut) {
      await StockAlert.create({
        product: productId,
        type: "out",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
      await notifyAdmins("Out of stock", `${productName} is out of stock.`);
    } else if (existingOut.countInStock !== count) {
      existingOut.countInStock = count;
      await existingOut.save();
    }
    return;
  }

  if (count <= STOCK_LOW_THRESHOLD) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "out" },
      { resolved: true }
    );
    const existingLow = await StockAlert.findOne({ product: productId, resolved: false, type: "low" });
    if (!existingLow) {
      await StockAlert.create({
        product: productId,
        type: "low",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
      await notifyAdmins("Low stock", `${productName} is low on stock (${count}).`);
    } else if (existingLow.countInStock !== count) {
      existingLow.countInStock = count;
      await existingLow.save();
    }
    return;
  }

  await StockAlert.updateMany(
    { product: productId, resolved: false },
    { resolved: true }
  );
}

function normalizeProductType(value) {
  return value === "resell" ? "resell" : "shop";
}

function canManageResellProduct(req, product) {
  if (req.user?.isAdmin) return true;
  if (!req.user?.userId || !product?.createdBy) return false;
  return String(product.createdBy) === String(req.user.userId);
}

function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }
  return value;
}

async function resolveValidCategory(categoryId) {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  return Category.findById(categoryId).lean();
}

function normalizeRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

async function hasVerifiedPurchase(userId, productId) {
  const purchased = await Order.exists({
    user: userId,
    status: { $in: ["shipped", "delivered"] },
    "orderItems.product": productId,
  });
  return Boolean(purchased);
}

async function updateProductReviewAggregate(productId) {
  const [stats] = await Review.aggregate([
    { $match: { targetType: "product", targetId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const rating = stats?.averageRating ? Number(stats.averageRating.toFixed(2)) : 0;
  const numReviews = stats?.reviewCount || 0;

  await Product.findByIdAndUpdate(productId, { rating, numReviews });
}

function normalizeReviewForResponse(req, reviewDoc) {
  const json = reviewDoc.toJSON();
  json.image = normalizeImageUrl(req, json.image);

  const comments = Array.isArray(json.comments) ? json.comments : [];
  json.comments = comments.map((comment) => ({
    ...comment,
    image: normalizeImageUrl(req, comment.image),
  }));

  if (json.comments.length === 0 && (json.comment || json.image)) {
    json.comments = [{
      id: `legacy-${json.id}`,
      text: json.comment || "",
      image: json.image || "",
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    }];
  }

  return json;
}

// GET /products — public, used by home screen
router.get("/", async (req, res) => {
  try {
    const productType = req.query?.type;
    const filter = productType === "shop" || productType === "resell"
      ? { productType }
      : {};
    const products = await Product.find(filter).populate("category", "id name color");
    const normalized = products.map((product) => {
      const json = product.toJSON();
      json.image = normalizeImageUrl(req, json.image);
      return json;
    });
    return res.status(200).json(normalized);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load products" });
  }
});

// GET /products/:id/reviews — public
router.get("/:id/reviews", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const reviews = await Review.find({ targetType: "product", targetId: req.params.id })
      .populate("user", "id name image")
      .sort({ createdAt: -1 });
    const normalized = reviews.map((review) => normalizeReviewForResponse(req, review));

    return res.status(200).json(normalized);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load reviews" });
  }
});

// POST /products/:id/reviews — authenticated, verified purchase required
router.post("/:id/reviews", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rating = normalizeRating(req.body?.rating);
    if (!rating) {
      return res.status(400).json({ message: "rating must be a whole number between 1 and 5" });
    }

    const alreadyReviewed = await Review.findOne({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    }).lean();
    if (alreadyReviewed) {
      return res.status(409).json({ message: "You already reviewed this product. Use update instead." });
    }

    const purchased = await hasVerifiedPurchase(req.user.userId, productId);
    if (!purchased) {
      return res.status(403).json({ message: "Only verified buyers can review this product" });
    }

    const created = await Review.create({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
      rating,
      comment: String(req.body?.comment || "").trim(),
      image: req.file ? buildImageUrl(req, req.file.filename) : "",
      comments: (String(req.body?.comment || "").trim() || req.file)
        ? [{ text: String(req.body?.comment || "").trim(), image: req.file ? buildImageUrl(req, req.file.filename) : "" }]
        : [],
    });

    await updateProductReviewAggregate(productId);

    const populated = await created.populate("user", "id name image");
    return res.status(201).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this product" });
    }
    return res.status(500).json({ message: error.message || "Failed to create review" });
  }
});

// PUT /products/:id/reviews/me — authenticated owner update (rating is one-time)
router.put("/:id/reviews/me", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    });

    if (!existing) {
      return res.status(404).json({ message: "Your review for this product was not found" });
    }

    if (req.body?.rating !== undefined) {
      const nextRating = normalizeRating(req.body.rating);
      if (!nextRating) {
        return res.status(400).json({ message: "rating must be a whole number between 1 and 5" });
      }
      if (Number(nextRating) !== Number(existing.rating)) {
        return res.status(409).json({ message: "Rating can only be set once. Add/edit comments instead." });
      }
    }

    if (req.body?.comment !== undefined) {
      existing.comment = String(req.body.comment || "").trim();
    }

    if (req.file) {
      existing.image = buildImageUrl(req, req.file.filename);
    } else if (req.body?.removeImage === "true" || req.body?.removeImage === true) {
      existing.image = "";
    }

    await existing.save();
    await updateProductReviewAggregate(productId);
    const populated = await existing.populate("user", "id name image");
    return res.status(200).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update review" });
  }
});

// POST /products/:id/reviews/me/comments — add comment under existing one-time rating
router.post("/:id/reviews/me/comments", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    });

    if (!existing) {
      return res.status(404).json({ message: "Create your rating first before adding more comments" });
    }

    const text = String(req.body?.comment || "").trim();
    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    if (!text && !image) {
      return res.status(400).json({ message: "comment text or image is required" });
    }

    existing.comments.push({ text, image });
    existing.comment = text || existing.comment;
    existing.image = image || existing.image;
    await existing.save();

    const populated = await existing.populate("user", "id name image");
    return res.status(201).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to add comment" });
  }
});

// PUT /products/:id/reviews/me/comments/:commentId — edit one comment
router.put("/:id/reviews/me/comments/:commentId", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const productId = req.params.id;
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    });
    if (!existing) {
      return res.status(404).json({ message: "Review not found" });
    }

    const target = existing.comments.id(commentId);
    if (!target) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (req.body?.comment !== undefined) {
      target.text = String(req.body.comment || "").trim();
      existing.comment = target.text;
    }

    if (req.file) {
      target.image = buildImageUrl(req, req.file.filename);
      existing.image = target.image;
    } else if (req.body?.removeImage === "true" || req.body?.removeImage === true) {
      target.image = "";
      existing.image = "";
    }

    await existing.save();
    const populated = await existing.populate("user", "id name image");
    return res.status(200).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to edit comment" });
  }
});

// DELETE /products/:id/reviews/me/comments/:commentId — delete one comment
router.delete("/:id/reviews/me/comments/:commentId", authJwt, async (req, res) => {
  try {
    const productId = req.params.id;
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    });
    if (!existing) {
      return res.status(404).json({ message: "Review not found" });
    }

    const target = existing.comments.id(commentId);
    if (!target) {
      return res.status(404).json({ message: "Comment not found" });
    }

    target.deleteOne();
    await existing.save();
    const populated = await existing.populate("user", "id name image");
    return res.status(200).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete comment" });
  }
});

// DELETE /products/:id/reviews/me — authenticated owner delete
router.delete("/:id/reviews/me", authJwt, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Review.findOneAndDelete({
      user: req.user.userId,
      targetType: "product",
      targetId: productId,
    });

    if (!existing) {
      return res.status(404).json({ message: "Your review for this product was not found" });
    }

    await updateProductReviewAggregate(productId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete review" });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "id name color");
    if (!product) return res.status(404).json({ message: "Product not found" });
    const json = product.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(200).json(json);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load product" });
  }
});

// POST /products — authenticated, shop is admin-only and resell is open to all roles
router.post("/", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    const productType = normalizeProductType(req.body.productType);
    if (productType === "shop" && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can add shop products" });
    }
    if (!name || !brand || !price || !category || countInStock === undefined) {
      return res.status(400).json({ message: "name, brand, price, category and countInStock are required" });
    }

    const categoryDoc = await resolveValidCategory(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: "Create a valid category first before adding a product" });
    }

    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    const product = await Product.create({
      productType,
      name, brand, price: Number(price), description, richDescription,
      category, countInStock: Number(countInStock),
      rating: Number(rating || 0), numReviews: Number(numReviews || 0),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image,
      createdBy: toObjectIdOrNull(req.user?.userId),
    });
    const populated = await product.populate("category", "id name color");
    await updateStockAlerts(product);
    const json = populated.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(201).json(json);
  } catch (error) {
    console.error("[POST /products] Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to create product" });
  }
});

// PUT /products/:id — admin only, multipart
router.put("/:id", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (existing.productType === "shop" && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can edit shop products" });
    }

    if (existing.productType === "resell" && !canManageResellProduct(req, existing)) {
      return res.status(403).json({ message: "Only the reseller or admin can edit this resell product" });
    }

    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    const nextType = req.body.productType !== undefined
      ? normalizeProductType(req.body.productType)
      : existing.productType;
    const nextCategory = category || existing.category;

    if (nextType === "shop" && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can assign shop products" });
    }

    if (existing.productType !== nextType && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can change product type" });
    }

    const categoryDoc = await resolveValidCategory(nextCategory);
    if (!categoryDoc) {
      return res.status(400).json({ message: "Create a valid category first before saving this product" });
    }

    const image = req.file ? buildImageUrl(req, req.file.filename) : existing.image;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        productType: nextType,
        name: name || existing.name,
        brand: brand || existing.brand,
        price: price !== undefined ? Number(price) : existing.price,
        description: description !== undefined ? description : existing.description,
        richDescription: richDescription !== undefined ? richDescription : existing.richDescription,
        category: nextCategory,
        countInStock: countInStock !== undefined ? Number(countInStock) : existing.countInStock,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        numReviews: numReviews !== undefined ? Number(numReviews) : existing.numReviews,
        isFeatured: isFeatured !== undefined ? (isFeatured === "true" || isFeatured === true) : existing.isFeatured,
        image,
      },
      { new: true }
    ).populate("category", "id name color");

    await updateStockAlerts(updated);

    const json = updated.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(200).json(json);
  } catch (error) {
    console.error('[PUT /products/:id] Error:', error.message, error.stack);
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
});

// DELETE /products/:id — admin only
router.delete("/:id", authJwt, async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (existing.productType === "shop" && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete shop products" });
    }

    if (existing.productType === "resell" && !canManageResellProduct(req, existing)) {
      return res.status(403).json({ message: "Only the reseller or admin can delete this resell product" });
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

module.exports = router;
