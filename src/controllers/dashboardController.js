import { getDashboardData } from "../services/dashboardService.js";

export const dashboard = async (req, res) => {
  try {
    const userId = req.user.id; // dari middleware auth

    const data = await getDashboardData(userId);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
