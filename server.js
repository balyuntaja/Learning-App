import express from "express";
import dotenv from "dotenv";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
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
    <h1>AI Learning Insight API</h1>
    <p>Status: <strong>Running</strong></p>
    <p>Available endpoint: <code>/dashboard</code></p>
  `);
});

app.use("/dashboard", dashboardRoutes);

export default app;
