import axios from "axios";

const DEFAULT_ML_URL = "https://ai-learning-insight-ai-learning-insight.up.railway.app/predict";

export async function callML(payload) {
  const base = process.env.ML_URL || DEFAULT_ML_URL;
  const endpoint = base.endsWith("/predict") ? base : `${base.replace(/\/$/, "")}/predict`;

  const response = await axios.post(endpoint, payload, { timeout: 20000 });
  if (!response || !response.data) {
    throw new Error("Invalid response from ML service");
  }
  return response.data;
}

