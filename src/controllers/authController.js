import { loginService } from "../services/authService.js";

export async function login(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const result = await loginService(email);

    if (!result.success) {
      return res.status(result.status).json(result);
    }

    return res.json(result);

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

