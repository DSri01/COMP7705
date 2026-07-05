const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const exifParser = require("exif-parser");

router.get("/", async (req, res) => {
  const { rows } = await req.db.query(
    "SELECT id, name, url, target_price, last_price, last_checked_at FROM products ORDER BY name"
  );
  res.render("products/list", { products: rows });
});

router.get("/new", (req, res) => {
  res.render("products/new");
});

router.post("/", async (req, res) => {
  const { name, url, target_price } = req.body;
  await req.db.query(
    "INSERT INTO products (name, url, target_price) VALUES ($1, $2, $3)",
    [name, url, parseFloat(target_price)]
  );
  res.redirect("/products");
});

router.get("/:id", async (req, res) => {
  const { rows: [product] } = await req.db.query(
    "SELECT * FROM products WHERE id = $1",
    [req.params.id]
  );
  const { rows: history } = await req.db.query(
    "SELECT old_price, new_price, detected_at FROM price_history WHERE product_id = $1 ORDER BY detected_at DESC LIMIT 30",
    [req.params.id]
  );
  res.render("products/detail", { product, history });
});

router.post("/:id/upload-image", async (req, res) => {
  const uploadsDir = path.join(__dirname, "../../uploads/products");
  if (!req.files || !req.files.image) {
    return res.status(400).send("No image uploaded");
  }

  const file = req.files.image;
  const filePath = path.join(uploadsDir, `${req.params.id}-${file.name}`);
  await file.mv(filePath);

  const buffer = fs.readFileSync(filePath);
  const parser = exifParser.create(buffer);
  const exifData = parser.parse();
  console.log(`[exif] product ${req.params.id}: ${JSON.stringify(exifData.tags)}`);

  await req.db.query(
    "UPDATE products SET image_url = $1, image_metadata = $2 WHERE id = $3",
    [`/uploads/products/${req.params.id}-${file.name}`, exifData.tags, req.params.id]
  );

  res.redirect(`/products/${req.params.id}`);
});

router.post("/:id/check", async (req, res) => {
  await req.db.query("SELECT scrape_single_product($1)", [req.params.id]);
  res.redirect(`/products/${req.params.id}`);
});

module.exports = router;
