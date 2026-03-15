const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Service = require("../models/Service");
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

router.get("/", async (_req, res) => {
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