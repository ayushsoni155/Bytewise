// api/order-history.js
import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID } = req.query;

  if (!enrolmentID) {
    return res.status(400).json({ message: 'Enrolment ID is required' });
  }

  try {
    const conn = await db.getConnection();
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
      [enrolmentID]
    );
    conn.release();

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
