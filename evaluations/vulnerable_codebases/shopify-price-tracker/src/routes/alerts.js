const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025"),
  secure: false,
});

router.get("/", async (req, res) => {
  const { rows } = await req.db.query(`
    SELECT a.*, p.name AS product_name
    FROM alerts a
    JOIN products p ON p.id = a.product_id
    ORDER BY a.created_at DESC
  `);
  res.render("alerts/list", { alerts: rows });
});

router.post("/", async (req, res) => {
  const { product_id, type, threshold } = req.body;
  await req.db.query(
    "INSERT INTO alerts (product_id, type, threshold) VALUES ($1, $2, $3)",
    [product_id, type, parseFloat(threshold)]
  );
  res.redirect("/alerts");
});

async function sendAlertEmail(alert, product) {
  await transporter.sendMail({
    from: process.env.ALERT_FROM || "noreply@price-tracker.internal",
    to: process.env.ALERT_TO || "team@company.com",
    subject: `[Price Alert] ${product.name} - ${alert.type}`,
    text: `${product.name} has triggered a ${alert.type} alert. Current price: ${product.last_price}, Threshold: ${alert.threshold}`,
  });
}

module.exports = { router, sendAlertEmail };
