const express = require("express");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Order = require("../models/Order");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");

const router = express.Router();

const STATUS = {
  PENDING: "pending",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

function normalizeStatus(value) {
  if (!value) return "";
  const lowered = String(value).toLowerCase();
  if (lowered === "3") return STATUS.PENDING;
  if (lowered === "2") return STATUS.SHIPPED;
  if (lowered === "1") return STATUS.DELIVERED;
  return lowered;
}

// POST /orders — authenticated user places an order
router.post("/", authJwt, async (req, res) => {
  try {
    const { orderItems } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const shippingAddress1 = String(userProfile.deliveryAddress1 || "").trim();
    const shippingAddress2 = String(userProfile.deliveryAddress2 || "").trim();
    const city = String(userProfile.deliveryCity || "").trim();
    const zip = String(userProfile.deliveryZip || "").trim();
    const country = String(userProfile.deliveryCountry || "").trim();
    const phone = String(userProfile.phone || "").trim();

    if (!phone || !shippingAddress1 || !city || !zip || !country) {
      return res.status(400).json({
        message: "Complete your profile delivery details first (phone, address, city, zip, country)",
      });
    }

    // Map each cart item to the embedded orderItem shape.
    // Cart items from Redux store have the full product object spread with a quantity field.
    // product id may come as item.id, item._id, or item.product
    const mappedItems = orderItems.map((item) => {
      const productId =
        item.product ||
        item.id ||
        (typeof item._id === "string" ? item._id : item._id?.toString());

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error(`Invalid product reference: ${JSON.stringify(productId)}`);
      }

      return {
        product: productId,
        name: item.name || "",
        price: Number(item.price) || 0,
        image: item.image || "",
        quantity: Number(item.quantity) || 1,
      };
    });

    // Calculate total price server-side to prevent tampering
    const totalPrice = mappedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      orderItems: mappedItems,
      shippingAddress1,
      shippingAddress2,
      city,
      zip,
      country,
      phone,
      status: STATUS.PENDING,
      totalPrice,
      user: req.user.userId,
      dateOrdered: new Date(),
    });

    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const adminTokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
    await sendToTokens(adminTokens, {
      title: "New order placed",
      body: `Order ${order.id} has been placed.`,
      data: { orderId: order.id },
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("[orders] POST error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to create order" });
  }
});

// GET /orders — admin sees all, user sees own orders (newest first)
router.get("/", authJwt, async (req, res) => {
  try {
    const filter = req.user?.isAdmin ? {} : { user: req.user.userId };
    const orders = await Order.find(filter)
      .populate("user", "id name email")
      .sort({ dateOrdered: -1 });
    return res.status(200).json(orders);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

// GET /orders/:id — auth required (admin or order owner)
router.get("/:id", authJwt, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "id name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user?._id?.toString() === req.user.userId;
    if (!req.user.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(order);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load order" });
  }
});

// PUT /orders/:id — admin or owner updates status with rules
router.put("/:id", authJwt, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const isOwner = existing.user?.toString() === req.user.userId;
    if (!req.user?.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const currentStatus = normalizeStatus(existing.status);
    const desiredStatus = normalizeStatus(status);

    if (![STATUS.PENDING, STATUS.SHIPPED, STATUS.DELIVERED, STATUS.CANCELLED].includes(desiredStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if ([STATUS.CANCELLED, STATUS.DELIVERED].includes(currentStatus)) {
      return res.status(409).json({ message: "Finalized orders cannot be updated" });
    }

    if (desiredStatus === currentStatus) {
      const unchanged = await existing.populate("user", "id name email");
      return res.status(200).json(unchanged);
    }

    const adminTransitions = {
      [STATUS.PENDING]: [STATUS.SHIPPED, STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const userTransitions = {
      [STATUS.PENDING]: [STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const allowed = req.user?.isAdmin
      ? adminTransitions[currentStatus] || []
      : userTransitions[currentStatus] || [];

    if (!allowed.includes(desiredStatus)) {
      return res.status(403).json({ message: "Status change not allowed" });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: desiredStatus,
      },
      { new: true }
    ).populate("user", "id name email");

    const recipient = await User.findById(existing.user).lean();
    if (recipient?.pushToken) {
      await sendToTokens([{ token: recipient.pushToken, type: recipient.pushTokenType || "fcm" }], {
        title: "Order status updated",
        body: `Order ${updated.id} is now ${desiredStatus}.`,
        data: { orderId: updated.id, status: desiredStatus },
      });
    }

    return res.status(200).json(updated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update order" });
  }
});

module.exports = router;
