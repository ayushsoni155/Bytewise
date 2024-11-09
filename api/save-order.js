// api/save-order.js
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

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

  const { enrolmentID, orderItems, totalPrice, transactionID } = req.body;
  const orderID = uuidv4();
  const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO orders (orderID, enrolmentID, transactionID, order_date, total_price) VALUES (?, ?, ?, ?, ?)`,
      [orderID, enrolmentID, transactionID, orderDate, totalPrice]
    );

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (orderID, productID, quantity) VALUES (?, ?, ?)`,
        [orderID, item.productID, item.quantity]
      );
    }

    await conn.commit();
    conn.release();

    res.status(200).json({ message: 'Order saved successfully', orderID });
  } catch (error) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
