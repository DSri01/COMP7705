const express = require("express");
const router = express.Router();

router.get("/products", async (req, res) => {
  const { rows } = await req.db.query(
    "SELECT id, name, url, target_price, last_price, last_checked_at FROM products ORDER BY name"
  );
  res.json(rows);
});

router.get("/products/:id/history", async (req, res) => {
  const { rows } = await req.db.query(
    "SELECT old_price, new_price, detected_at FROM price_history WHERE product_id = $1 ORDER BY detected_at DESC",
    [req.params.id]
  );
  res.json(rows);
});

router.get("/stats", async (req, res) => {
  const { rows: [stats] } = await req.db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE last_price IS NOT NULL) AS tracked,
      COUNT(*) FILTER (WHERE last_price < target_price) AS below_target,
      ROUND(AVG(last_price), 2) AS avg_price,
      MIN(last_price) AS min_price,
      MAX(last_price) AS max_price
    FROM products
  `);
  res.json(stats);
});

router.post("/scrape/all", async (req, res) => {
  const { rows } = await req.db.query("SELECT id FROM products WHERE last_checked_at < NOW() - INTERVAL '1 hour'");
  for (const row of rows) {
    await req.scrapeQueue.add("scrape", { productId: row.id });
  }
  res.json({ queued: rows.length });
});

module.exports = router;
