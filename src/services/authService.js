import pool from "../db/pool.js";
import { Q } from "../db/queries.js";
import { generateToken } from "../utils/jwt.js";

export async function loginService(email) {
  const client = await pool.connect();

  try {
    const resUser = await client.query(Q.user_by_email, [email]);
    const user = resUser.rows[0];

    if (!user) {
      return { success: false, status: 404, message: "User not found" };
    }

    const token = generateToken({
      id: user.id,
      email: user.email
    });

    return {
      success: true,
      token,
      user
    };

  } finally {
    client.release();
  }
}

