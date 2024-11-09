// api/feedback-submit.js
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

  const { enrolmentID, feedback } = req.body;

  if (!enrolmentID || !feedback) {
    return res.status(400).json({ message: 'Enrolment ID and feedback are required' });
  }

  try {
    const conn = await db.getConnection();
    await conn.query(
      'INSERT INTO feedback (enrolmentID, feedback) VALUES (?, ?)',
      [enrolmentID, feedback]
    );
    conn.release();

    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
