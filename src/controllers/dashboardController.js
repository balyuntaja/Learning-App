import { getDashboardData } from "../services/dashboardService.js";

export async function getDashboard(req, res) {
  try {
    
    const email = req.user.email;

    const result = await getDashboardData(email);

    if (!result.success) {
      const status = result.status ?? 500;
      return res.status(status).json({
        success: false,
        message: result.message ?? "Internal server error"
      });
    }

    return res.json(result);

  } catch (err) {
    console.error("Dashboard controller error:", err?.response?.data ?? err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message ?? String(err)
    });
  }
}
