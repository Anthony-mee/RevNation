const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authJwt = require("../middleware/authJwt");
const Product = require("../models/Product");
const StockAlert = require("../models/StockAlert");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");
const config = require("../config");

const router = express.Router();

const uploadPath = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadPath, { recursive: true });

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

const STOCK_LOW_THRESHOLD = 10;

async function notifyAdmins(title, body) {
  try {
    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const tokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
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

function buildImageUrl(req, filename) {
  if (!filename) return "";
  return `${req.protocol}://${req.get("host")}/${config.uploadDir}/${filename}`;
}

function normalizeProductType(value) {
  return value === "resell" ? "resell" : "shop";
}

function canManageResellProduct(req, product) {
  if (req.user?.isAdmin) return true;
  if (!req.user?.userId || !product?.createdBy) return false;
  return String(product.createdBy) === String(req.user.userId);
}

// GET /products — public, used by home screen
router.get("/", async (req, res) => {
  try {
    const productType = req.query?.type;
    const filter = productType === "shop" || productType === "resell"
      ? { productType }
      : {};
    const products = await Product.find(filter).populate("category", "id name color");
    return res.status(200).json(products);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load products" });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "id name color");
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json(product);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load product" });
  }
});

// POST /products — authenticated, shop is admin-only and resell is open to all roles
router.post("/", authJwt, upload.single("image"), async (req, res) => {
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
    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    const product = await Product.create({
      productType,
      name, brand, price: Number(price), description, richDescription,
      category, countInStock: Number(countInStock),
      rating: Number(rating || 0), numReviews: Number(numReviews || 0),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image,
      createdBy: req.user?.userId || null,
    });
    const populated = await product.populate("category", "id name color");
    await updateStockAlerts(product);
    return res.status(201).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// PUT /products/:id — admin only, multipart
router.put("/:id", authJwt, upload.single("image"), async (req, res) => {
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

    if (nextType === "shop" && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can assign shop products" });
    }

    if (existing.productType !== nextType && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can change product type" });
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
        category: category || existing.category,
        countInStock: countInStock !== undefined ? Number(countInStock) : existing.countInStock,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        numReviews: numReviews !== undefined ? Number(numReviews) : existing.numReviews,
        isFeatured: isFeatured !== undefined ? (isFeatured === "true" || isFeatured === true) : existing.isFeatured,
        image,
      },
      { new: true }
    ).populate("category", "id name color");

    await updateStockAlerts(updated);

    return res.status(200).json(updated);
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
