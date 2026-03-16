const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Service = require("../models/Service");
const Review = require("../models/Review");
const Order = require("../models/Order");
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

function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }
  return value;
}

function normalizeRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

async function hasVerifiedPurchase(userId, serviceId) {
  const purchased = await Order.exists({
    user: userId,
    status: { $in: ["shipped", "delivered"] },
    "orderItems.product": serviceId,
  });
  return Boolean(purchased);
}

async function updateServiceReviewAggregate(serviceId) {
  const [stats] = await Review.aggregate([
    { $match: { targetType: "service", targetId: new mongoose.Types.ObjectId(serviceId) } },
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

  await Service.findByIdAndUpdate(serviceId, { rating, numReviews });
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

router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    const normalized = services.map((service) => {
      const json = service.toJSON();
      json.image = normalizeImageUrl(req, json.image);
      return json;
    });
    return res.status(200).json(normalized);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load services" });
  }
});

// GET /services/:id/reviews — public
router.get("/:id/reviews", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const reviews = await Review.find({ targetType: "service", targetId: req.params.id })
      .populate("user", "id name image")
      .sort({ createdAt: -1 });
    const normalized = reviews.map((review) => normalizeReviewForResponse(req, review));

    return res.status(200).json(normalized);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load reviews" });
  }
});

// POST /services/:id/reviews — authenticated, verified purchase required
router.post("/:id/reviews", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const serviceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const service = await Service.findById(serviceId).lean();
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const rating = normalizeRating(req.body?.rating);
    if (!rating) {
      return res.status(400).json({ message: "rating must be a whole number between 1 and 5" });
    }

    const alreadyReviewed = await Review.findOne({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
    }).lean();
    if (alreadyReviewed) {
      return res.status(409).json({ message: "You already reviewed this service. Use update instead." });
    }

    const purchased = await hasVerifiedPurchase(req.user.userId, serviceId);
    if (!purchased) {
      return res.status(403).json({ message: "Only verified buyers can review this service" });
    }

    const created = await Review.create({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
      rating,
      comment: String(req.body?.comment || "").trim(),
      image: req.file ? buildImageUrl(req, req.file.filename) : "",
      comments: (String(req.body?.comment || "").trim() || req.file)
        ? [{ text: String(req.body?.comment || "").trim(), image: req.file ? buildImageUrl(req, req.file.filename) : "" }]
        : [],
    });

    await updateServiceReviewAggregate(serviceId);

    const populated = await created.populate("user", "id name image");
    return res.status(201).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this service" });
    }
    return res.status(500).json({ message: error.message || "Failed to create review" });
  }
});

// PUT /services/:id/reviews/me — authenticated owner update (rating is one-time)
router.put("/:id/reviews/me", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const serviceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
    });

    if (!existing) {
      return res.status(404).json({ message: "Your review for this service was not found" });
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
    await updateServiceReviewAggregate(serviceId);
    const populated = await existing.populate("user", "id name image");
    return res.status(200).json(normalizeReviewForResponse(req, populated));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update review" });
  }
});

// POST /services/:id/reviews/me/comments — add comment under existing one-time rating
router.post("/:id/reviews/me/comments", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const serviceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
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

// PUT /services/:id/reviews/me/comments/:commentId — edit one comment
router.put("/:id/reviews/me/comments/:commentId", authJwt, uploadSingleImage, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
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

// DELETE /services/:id/reviews/me/comments/:commentId — delete one comment
router.delete("/:id/reviews/me/comments/:commentId", authJwt, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const commentId = req.params.commentId;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const existing = await Review.findOne({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
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

// DELETE /services/:id/reviews/me — authenticated owner delete
router.delete("/:id/reviews/me", authJwt, async (req, res) => {
  try {
    const serviceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const existing = await Review.findOneAndDelete({
      user: req.user.userId,
      targetType: "service",
      targetId: serviceId,
    });

    if (!existing) {
      return res.status(404).json({ message: "Your review for this service was not found" });
    }

    await updateServiceReviewAggregate(serviceId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete review" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    const json = service.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(200).json(json);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load service" });
  }
});

router.post("/", authJwt, uploadSingleImage, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can add services" });
    }

    const { name, description, richDescription, price, duration, isFeatured } = req.body;

    if (!name || price === undefined || price === "") {
      return res.status(400).json({ message: "name and price are required" });
    }

    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    const service = await Service.create({
      name,
      description,
      richDescription,
      price: Number(price),
      duration,
      isFeatured: isFeatured === "true" || isFeatured === true,
      image,
      createdBy: toObjectIdOrNull(req.user?.userId),
    });

    const json = service.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(201).json(json);
  } catch (error) {
    console.error("[POST /services] Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to create service" });
  }
});

router.put("/:id", authJwt, uploadSingleImage, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can update services" });
    }

    const existing = await Service.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Service not found" });
    }

    const { name, description, richDescription, price, duration, isFeatured } = req.body;
    const image = req.file ? buildImageUrl(req, req.file.filename) : existing.image;

    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        richDescription: richDescription !== undefined ? richDescription : existing.richDescription,
        price: price !== undefined && price !== "" ? Number(price) : existing.price,
        duration: duration !== undefined ? duration : existing.duration,
        isFeatured: isFeatured !== undefined ? (isFeatured === "true" || isFeatured === true) : existing.isFeatured,
        image,
      },
      { new: true }
    );

    const json = updated.toJSON();
    json.image = normalizeImageUrl(req, json.image);
    return res.status(200).json(json);
  } catch (error) {
    console.error("[PUT /services/:id] Error:", error.message);
    return res.status(500).json({ message: "Failed to update service", error: error.message });
  }
});

router.delete("/:id", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete services" });
    }

    const existing = await Service.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Service not found" });
    }

    await Service.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete service" });
  }
});

module.exports = router;