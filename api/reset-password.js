// api/reset-password.js
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID, newPassword, confirmPassword } = req.body;

  if (!enrolmentID || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const conn = await db.getConnection();
    await conn.query('UPDATE user_info SET password = ? WHERE enrolmentID = ?', [hashedPassword, enrolmentID]);
    conn.release();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
