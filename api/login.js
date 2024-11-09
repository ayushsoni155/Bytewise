import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import nextCors from 'nextjs-cors';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  // Run the CORS middleware
  await nextCors(req, res, {
    methods: ['GET', 'POST', 'OPTIONS'],
    origin: 'https://bytewise24.vercel.app', // Allow all origins, or specify an array of allowed origins
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID, password } = req.body;

  if (!enrolmentID || !password) {
    return res.status(400).json({ message: 'Enrollment ID and password are required' });
  }

  try {
    const conn = await db.getConnection();
    const [results] = await conn.query(
      'SELECT * FROM user_info WHERE enrolmentID = ?',
      [enrolmentID]
    );

    if (results.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Invalid enrolment ID or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    conn.release();

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid enrolment ID or password' });
    }

    const { password: _, ...userData } = user;
    res.status(200).json({ message: 'Login successful', user: userData });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
