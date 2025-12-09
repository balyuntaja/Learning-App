import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // cek email sudah ada atau belum
    const exists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert user
    await pool.query(
        `INSERT INTO users (id, name, email, password, user_role, created_at, updated_at)
         VALUES (EXTRACT(EPOCH FROM NOW())::BIGINT, $1, $2, $3, 0, NOW(), NOW())`,
        [name, email, hashedPassword]
      );
      

    res.json({ message: "Registrasi berhasil" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email } = req.body;

    // cek user
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Email tidak ditemukan" });
    }

    const foundUser = user.rows[0];

    // generate token
    const token = jwt.sign(
      { id: foundUser.id, email: foundUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login sukses",
      token,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
      },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
