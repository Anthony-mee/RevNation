const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const mongoose = require("mongoose");
const config = require("./config");
const userRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const serviceRoutes = require("./routes/services");
const orderRoutes = require("./routes/orders");
const stockAlertRoutes = require("./routes/stockAlerts");
const adminRoutes = require("./routes/admin");
const promotionRoutes = require("./routes/promotions");
const couponRoutes = require("./routes/coupons");
const notificationRoutes = require("./routes/notifications");
const {
  getUploadDirName,
  getUploadAbsolutePath,
  ensureUploadDirExists,
  getLegacyUploadPaths,
} = require("./utils/uploads");

const app = express();
ensureUploadDirExists();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(`/${getUploadDirName()}`, express.static(getUploadAbsolutePath()));
for (const legacyPath of getLegacyUploadPaths()) {
  app.use(`/${getUploadDirName()}`, express.static(legacyPath));
}

app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/categories`, categoryRoutes);
app.use(`${config.apiPrefix}/products`, productRoutes);
app.use(`${config.apiPrefix}/services`, serviceRoutes);
app.use(`${config.apiPrefix}/orders`, orderRoutes);
app.use(`${config.apiPrefix}/stock-alerts`, stockAlertRoutes);
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/promotions`, promotionRoutes);
app.use(`${config.apiPrefix}/coupons`, couponRoutes);
app.use(`${config.apiPrefix}/notifications`, notificationRoutes);

app.get(`${config.apiPrefix}/health`, (_req, res) => {
  res.status(200).json({ ok: true, message: "Backend config scaffold is running." });
});

app.get(`${config.apiPrefix}/health/db`, (_req, res) => {
  res.status(200).json({
    ok: true,
    mongo: {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || "",
      dbName: mongoose.connection.name || "",
    },
  });
});

module.exports = app;
