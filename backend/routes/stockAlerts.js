const express = require("express");
const router = express.Router();
const authJwt = require("../middleware/authJwt");
const StockAlert = require("../models/StockAlert");
const StockService = require("../services/stockService");

// GET /stock-alerts — get all active stock alerts
router.get("/", authJwt, async (req, res) => {
  try {
    // Get all active stock alerts using the stock service
    const result = await StockService.getAllStockAlerts();
    
    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }
    
    return res.status(200).json({
      alerts: result.alerts,
      total: result.alerts.length
    });
    
  } catch (error) {
    console.error('[GET /stock-alerts] Error:', error.message);
    return res.status(500).json({ message: "Failed to fetch stock alerts" });
  }
});

// POST /stock-alerts/resolve — resolve a stock alert
router.post("/resolve", authJwt, async (req, res) => {
  try {
    const { alertId } = req.body;
    
    if (!alertId) {
      return res.status(400).json({ message: "Alert ID is required" });
    }
    
    const alert = await StockAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ message: "Stock alert not found" });
    }
    
    // Mark alert as resolved
    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();
    
    console.log(`[POST /stock-alerts/resolve] Stock alert ${alertId} resolved`);
    
    return res.status(200).json({
      message: "Stock alert resolved successfully",
      alert: {
        id: alert._id,
        resolved: true,
        resolvedAt: alert.resolvedAt
      }
    });
    
  } catch (error) {
    console.error('[POST /stock-alerts/resolve] Error:', error.message);
    return res.status(500).json({ message: "Failed to resolve stock alert" });
  }
});

// GET /stock-alerts/product/:productId — get stock status for specific product
router.get("/product/:productId", authJwt, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await StockService.getStockStatus(productId);
    
    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('[GET /stock-alerts/product/:productId] Error:', error.message);
    return res.status(500).json({ message: "Failed to get stock status" });
  }
});

module.exports = router;
