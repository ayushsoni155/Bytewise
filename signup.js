// api/signup.js
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

  const { enrolmentID, name, sem, phone, password } = req.body;

  if (!name || !enrolmentID || !password || !phone || !sem) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const conn = await db.getConnection();

    const [existingUser] = await conn.query(
      'SELECT enrolmentID FROM user_info WHERE enrolmentID = ?',
      [enrolmentID]
    );
    if (existingUser.length > 0) {
      conn.release();
      return res.status(400).json({ message: 'Enrolment already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await conn.query(
      'INSERT INTO user_info (enrolmentID, name, sem, phone, password) VALUES (?, ?, ?, ?, ?)',
      [enrolmentID, name, sem, phone, hashedPassword]
    );

    conn.release();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
