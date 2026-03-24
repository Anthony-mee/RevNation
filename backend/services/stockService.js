/**
 * Stock Management Service
 * Handles stock updates and low stock notifications
 */

const Product = require("../models/Product");
const StockAlert = require("../models/StockAlert");
const { sendToTokens } = require("./notifications");

class StockService {
    /**
     * Update stock levels when an order is placed
     * @param {Array} orderItems - Array of order items with productId and quantity
     * @param {String} orderId - Order ID for reference
     */
    static async updateStockOnOrder(orderItems, orderId) {
        console.log(`[StockService] Processing stock updates for order ${orderId}`);
        
        const stockUpdates = [];
        const lowStockAlerts = [];
        
        for (const item of orderItems) {
            try {
                const product = await Product.findById(item.productId);
                if (!product) {
                    console.error(`[StockService] Product ${item.productId} not found`);
                    continue;
                }
                
                const previousStock = product.countInStock;
                const newStock = Math.max(0, previousStock - item.quantity);
                
                // Update product stock
                product.countInStock = newStock;
                await product.save();
                
                stockUpdates.push({
                    productId: product._id,
                    productName: product.name,
                    previousStock,
                    quantityOrdered: item.quantity,
                    newStock,
                    stockChange: previousStock - newStock
                });
                
                console.log(`[StockService] Updated stock for ${product.name}: ${previousStock} → ${newStock}`);
                
                // Check for low stock alerts
                await this.checkAndCreateLowStockAlert(product, newStock, lowStockAlerts);
                
            } catch (error) {
                console.error(`[StockService] Error updating stock for product ${item.productId}:`, error.message);
            }
        }
        
        // Send low stock notifications
        if (lowStockAlerts.length > 0) {
            await this.sendLowStockNotifications(lowStockAlerts);
        }
        
        return {
            success: true,
            stockUpdates,
            lowStockAlerts: lowStockAlerts.length
        };
    }
    
    /**
     * Check if stock is low and create/update alert
     * @param {Object} product - Product document
     * @param {Number} currentStock - Current stock level
     * @param {Array} lowStockAlerts - Array to collect alerts
     */
    static async checkAndCreateLowStockAlert(product, currentStock, lowStockAlerts) {
        try {
            // Find existing low stock alert for this product
            let stockAlert = await StockAlert.findOne({
                product: product._id,
                type: "low",
                resolved: false
            });
            
            // Get threshold from existing alert or use default
            const threshold = stockAlert ? stockAlert.threshold : 5; // Default threshold of 5 items
            
            // Check if stock is low
            if (currentStock <= threshold) {
                if (stockAlert) {
                    // Update existing alert
                    stockAlert.countInStock = currentStock;
                    stockAlert.threshold = threshold;
                    await stockAlert.save();
                    
                    console.log(`[StockService] Updated low stock alert for ${product.name}: ${currentStock} units (threshold: ${threshold})`);
                } else {
                    // Create new alert
                    stockAlert = new StockAlert({
                        product: product._id,
                        type: "low",
                        threshold,
                        countInStock: currentStock,
                        resolved: false
                    });
                    
                    await stockAlert.save();
                    
                    console.log(`[StockService] Created low stock alert for ${product.name}: ${currentStock} units (threshold: ${threshold})`);
                }
                
                // Add to alerts array for notification
                lowStockAlerts.push({
                    product,
                    currentStock,
                    threshold,
                    productName: product.name,
                    productId: product._id
                });
            } else if (stockAlert && currentStock > threshold * 2) {
                // Resolve the alert if stock is replenished
                stockAlert.resolved = true;
                stockAlert.resolvedAt = new Date();
                await stockAlert.save();
                
                console.log(`[StockService] Resolved low stock alert for ${product.name}: Stock replenished`);
            }
            
        } catch (error) {
            console.error(`[StockService] Error checking stock alert for ${product.name}:`, error.message);
        }
    }
    
    /**
     * Send push notifications for low stock alerts
     * @param {Array} lowStockAlerts - Array of low stock alerts
     */
    static async sendLowStockNotifications(lowStockAlerts) {
        try {
            console.log(`[StockService] Sending ${lowStockAlerts.length} low stock notifications`);
            
            for (const alert of lowStockAlerts) {
                const notification = {
                    title: "🚨 Low Stock Alert",
                    body: `${alert.productName} is running low! Only ${alert.currentStock} units left (threshold: ${alert.threshold})`,
                    data: {
                        type: "low_stock_alert",
                        productId: alert.productId,
                        productName: alert.productName,
                        currentStock: alert.currentStock,
                        threshold: alert.threshold,
                        action: "view_product"
                    },
                    priority: "high"
                };
                
                // Send to admin users
                await this.sendNotificationToAdmins(notification, alert);
                
                // Send to users with push tokens
                await this.sendNotificationToUsers(notification);
            }
            
        } catch (error) {
            console.error(`[StockService] Error sending low stock notifications:`, error.message);
        }
    }
    
    /**
     * Send notification to admin users
     */
    static async sendNotificationToAdmins(notification, alert) {
        try {
            // Get all admin users
            const User = require("../models/User");
            const adminUsers = await User.find({ isAdmin: true });
            
            const adminTokens = [];
            for (const admin of adminUsers) {
                if (admin.pushTokens && admin.pushTokens.length > 0) {
                    adminTokens.push(...admin.pushTokens.map(t => t.token));
                }
            }
            
            if (adminTokens.length > 0) {
                notification.to = adminTokens;
                await sendToTokens(notification);
                console.log(`[StockService] Sent low stock notification to ${adminTokens.length} admin users`);
            }
            
        } catch (error) {
            console.error(`[StockService] Error sending notification to admins:`, error.message);
        }
    }
    
    /**
     * Send notification to all users with push tokens
     */
    static async sendNotificationToUsers(notification) {
        try {
            // Get all users with push tokens
            const User = require("../models/User");
            const users = await User.find({ 
                pushTokens: { $exists: true, $ne: [] },
                isBanned: false,
                isDisabled: false 
            });
            
            const userTokens = [];
            for (const user of users) {
                if (user.pushTokens && user.pushTokens.length > 0) {
                    userTokens.push(...user.pushTokens.map(t => t.token));
                }
            }
            
            if (userTokens.length > 0) {
                notification.to = userTokens;
                await sendToTokens(notification);
                console.log(`[StockService] Sent low stock notification to ${userTokens.length} users`);
            }
            
        } catch (error) {
            console.error(`[StockService] Error sending notification to users:`, error.message);
        }
    }
    
    /**
     * Get stock status for a product
     * @param {String} productId - Product ID
     */
    static async getStockStatus(productId) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                return { success: false, message: "Product not found" };
            }
            
            // Get active low stock alert
            const stockAlert = await StockAlert.findOne({
                product: productId,
                type: "low",
                resolved: false
            });
            
            return {
                success: true,
                product: {
                    id: product._id,
                    name: product.name,
                    countInStock: product.countInStock,
                    threshold: stockAlert ? stockAlert.threshold : 5,
                    hasLowStockAlert: !!stockAlert && !stockAlert.resolved
                }
            };
            
        } catch (error) {
            console.error(`[StockService] Error getting stock status:`, error.message);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Get all active stock alerts
     */
    static async getAllStockAlerts() {
        try {
            const alerts = await StockAlert.find({
                resolved: false
            })
            .populate('product', 'name countInStock')
            .sort({ createdAt: -1 });
            
            return {
                success: true,
                alerts: alerts.map(alert => ({
                    id: alert._id,
                    productName: alert.product.name,
                    currentStock: alert.countInStock,
                    threshold: alert.threshold,
                    type: alert.type,
                    createdAt: alert.createdAt
                }))
            };
            
        } catch (error) {
            console.error(`[StockService] Error getting stock alerts:`, error.message);
            return { success: false, message: error.message };
        }
    }
}

module.exports = StockService;
