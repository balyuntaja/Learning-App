import express from "express";
import dotenv from "dotenv";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";

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

app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dashboard service listening on ${PORT}`);
});
