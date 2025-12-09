1. Auth Controller — controllers/authController.js
const pool = require("../db/dbPool");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email } = req.body;

  // Validation
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    // Look for user
    const result = await pool.query(
      `SELECT id, name, display_name, email, image_path 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = result.rows[0];

    // Generate JWT payload
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      user,
      token
    });

  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

🚦 2. Auth Route — routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

router.post("/login", login);

module.exports = router;

🔧 3. Auth Middleware — middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains: { id: ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

🧠 4. Dashboard Service — services/dashboardService.js

(Ini tetap sama dari versi sebelumnya)

🎛️ 5. Dashboard Controller — controllers/dashboardController.js
const { getDashboardData } = require("../services/dashboardService");

exports.dashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getDashboardData(userId);

    return res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

🛣️ 6. Dashboard Route — routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { dashboard } = require("../controllers/dashboardController");

router.get("/dashboard", auth, dashboard);

module.exports = router;

🗄️ 7. Database Config — db/dbPool.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = pool;

🚀 8. Main App — app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./src/routes/authRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

app.use("/auth", authRoutes);
app.use("/", dashboardRoutes);

// Base route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

⚙️ 9. Environment Variable — .env
DATABASE_URL=postgres://username:password@localhost:5432/yourdb
JWT_SECRET=superSecretKey123
PORT=3000

🧪 Cara Login di Frontend

Kirim request:

const res = await axios.post("/auth/login", {
  email: "igihcksn@gmail.com"
});

localStorage.setItem("token", res.data.token);


Lalu fetch dashboard:

const res = await axios.get("/dashboard", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

🎉 Selesai — Login tanpa password berhasil diintegrasikan!