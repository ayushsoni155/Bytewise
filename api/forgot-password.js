// api/forgot-password.js
import mysql from 'mysql2/promise';

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

  const { enrolmentID, phone } = req.body;

  if (!enrolmentID || !phone) {
    return res.status(400).json({ message: 'Enrollment ID and phone number are required' });
  }

  try {
    const conn = await db.getConnection();
    const [results] = await conn.query(
      'SELECT * FROM user_info WHERE enrolmentID = ? AND phone = ?',
      [enrolmentID, phone]
    );
    conn.release();

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid enrolment ID or phone number' });
    }

    res.status(200).json({ message: 'Verification successful! You can now reset your password.' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
