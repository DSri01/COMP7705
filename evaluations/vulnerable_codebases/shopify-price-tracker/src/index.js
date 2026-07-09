require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");

const { initScrapeQueue } = require("./utils/queue");
const dashboardRoutes = require("./routes/dashboard");
const productsRoutes = require("./routes/products");
const apiRoutes = require("./routes/api");
const alertsRoutes = require("./routes/alerts");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    store: new pgSession({ pool }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use(require("express-fileupload")());

app.use((req, res, next) => {
  req.io = io;
  req.db = pool;
  next();
});

app.use("/", dashboardRoutes);
app.use("/products", productsRoutes);
app.use("/api", apiRoutes);
app.use("/alerts", alertsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

io.on("connection", (socket) => {
  console.log(`[ws] client connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`[ws] client disconnected: ${socket.id}`));
});

const scrapeQueue = initScrapeQueue(pool, io);
scrapeQueue.on("completed", (job, result) => {
  io.emit("price-update", { productId: job.data.productId, prices: result });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

module.exports = { app, server, io };
