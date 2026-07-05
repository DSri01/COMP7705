const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const { rows: products } = await req.db.query(
    "SELECT id, name, url, image_url, last_checked_at FROM products ORDER BY name LIMIT 50"
  );
  const { rows: stats } = await req.db.query(`
    SELECT
      COUNT(*) FILTER (WHERE last_price IS NOT NULL) AS tracked,
      COUNT(*) FILTER (WHERE last_price < target_price) AS below_target,
      ROUND(AVG(last_price), 2) AS avg_price
    FROM products
  `);
  const { rows: recentChanges } = await req.db.query(`
    SELECT p.name, ph.old_price, ph.new_price, ph.detected_at
    FROM price_history ph
    JOIN products p ON p.id = ph.product_id
    ORDER BY ph.detected_at DESC
    LIMIT 10
  `);

  res.render("dashboard", {
    products,
    stats: stats[0],
    recentChanges,
  });
});

module.exports = router;
