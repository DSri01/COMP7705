const Bull = require("bull");
const axios = require("axios");
const cheerio = require("cheerio");

function initScrapeQueue(db, io) {
  const queue = new Bull("scrape", process.env.REDIS_URL || "redis://localhost:6379", {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  });

  queue.process("scrape", async (job) => {
    const { productId } = job.data;
    const { rows: [product] } = await db.query("SELECT * FROM products WHERE id = $1", [productId]);
    if (!product) throw new Error(`Product ${productId} not found`);

    const response = await axios.get(product.url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceTracker/1.0)" },
    });

    const $ = cheerio.load(response.data);
    const priceText = $(".price").first().text().replace(/[^0-9.]/g, "");
    const newPrice = parseFloat(priceText);

    if (isNaN(newPrice)) throw new Error(`Could not parse price for product ${productId}`);

    if (product.last_price !== null && product.last_price !== newPrice) {
      await db.query(
        "INSERT INTO price_history (product_id, old_price, new_price) VALUES ($1, $2, $3)",
        [productId, product.last_price, newPrice]
      );
    }

    await db.query(
      "UPDATE products SET last_price = $1, last_checked_at = NOW() WHERE id = $2",
      [newPrice, productId]
    );

    return { productId, price: newPrice };
  });

  queue.on("failed", (job, err) => {
    console.error(`[queue] job ${job.id} failed: ${err.message}`);
  });

  return queue;
}

module.exports = { initScrapeQueue };
