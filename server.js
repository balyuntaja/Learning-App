import express from "express";
import dotenv from "dotenv";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <div style="
      font-family: 'Inter', sans-serif;
      padding: 40px;
      max-width: 700px;
      margin: auto;
      line-height: 1.6;
      color: #1a1a1a;
    ">
      <h1 style="
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 10px;
        color: #2563eb;
      ">
        🔍 AI Learning Insight API
      </h1>

      <p style="font-size: 18px; margin-bottom: 20px;">
        Your API is <span style="color: #16a34a; font-weight: 600;">Running Successfully</span> 🚀
      </p>

      <div style="
        background: #f3f4f6;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        margin-bottom: 20px;
      ">
        <h3 style="margin: 0 0 10px 0; color: #111827;">Available Endpoints</h3>
        <code style="
          display: inline-block;
          background: #e0e7ff;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 16px;
          color: #3730a3;
        ">
          GET /dashboard
        </code>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        © ${new Date().getFullYear()} AI Learning Insight API — Built with Node.js
      </p>
    </div>
  `);
});

app.use("/auth", authRoutes);

app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan pada http://localhost:${PORT}`);
});

export default app;
