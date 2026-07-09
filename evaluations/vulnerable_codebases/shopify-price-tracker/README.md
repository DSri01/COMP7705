# Shopify Price Tracker

Internal tool used by the e-commerce team to track competitor pricing across Shopify stores. Built as a Node.js/Express web application with real-time price update notifications via WebSockets.

## Features

- **Dashboard** — Overview of tracked products with stats and recent price changes
- **Product Management** — Add products by URL, set target prices, upload product images
- **Automated Scraping** — Background jobs (Bull/Redis) that periodically check product pages and record price changes
- **Real-time Updates** — WebSocket notifications when prices change (Socket.IO)
- **Price Alerts** — Email notifications when prices drop below thresholds
- **Product Images** — Upload product photos with EXIF metadata extraction

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18 |
| Framework | Express 4.18 |
| Templates | EJS |
| Database | PostgreSQL 15 |
| Queue | Bull + Redis |
| Real-time | Socket.IO 4.6 |
| Scraping | Axios + Cheerio |
| Image Metadata | exif-parser 0.1.12 |
| Email | Nodemailer |

## Quick Start

```bash
# Start all services
docker compose up --build

# Or run locally with Docker for dependencies only
docker compose up postgres redis
npm install
npm run dev
```

The app is available at http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List all products (JSON) |
| GET | /api/products/:id/history | Price history for a product |
| GET | /api/stats | Aggregate statistics |
| POST | /api/scrape/all | Trigger price check for all stale products |

## Configuration

Copy `.env.example` to `.env` and adjust:

```
DATABASE_URL=postgresql://tracker:tracker@localhost:5432/pricing
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change-me-in-production
SMTP_HOST=localhost
SMTP_PORT=1025
```

## Project Structure

```
src/
  index.js          # App entry point, HTTP + WebSocket server
  routes/
    dashboard.js    # Main dashboard view
    products.js     # Product CRUD + image upload
    api.js          # JSON API endpoints
    alerts.js       # Price alert management + email
  views/            # EJS templates
  public/css/       # Stylesheets
  utils/
    queue.js        # Bull scrape queue worker
db/
  schema.sql        # Database schema
  seed.sql          # Sample data
```

## Recent Changes

- **v1.4.2** — Added product image upload with EXIF parsing
- **v1.4.0** — Real-time dashboard via Socket.IO
- **v1.3.0** — Price alert email notifications
- **v1.2.0** — Background scraping with Bull queue
- **v1.0.0** — Initial release with manual price tracking
