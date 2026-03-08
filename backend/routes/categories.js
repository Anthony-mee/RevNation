const express = require("express");
const authJwt = require("../middleware/authJwt");
const Category = require("../models/Category");

const router = express.Router();

// GET /categories — public, used by home screen and admin
router.get("/", async (_req, res) => {
  try {
    const categories = await Category.find();
    return res.status(200).json(categories);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load categories" });
  }
});

// POST /categories — admin only
router.post("/", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }
    const category = await Category.create({ name: String(name).trim(), color, icon });
    return res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Failed to create category" });
  }
});

// PUT /categories/:id — admin only
router.put("/:id", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: String(name).trim(), color, icon },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Failed to update category" });
  }
});

// DELETE /categories/:id — admin only
router.delete("/:id", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete category" });
  }
});

module.exports = router;
