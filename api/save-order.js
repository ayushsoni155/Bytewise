import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers (adjust as needed)
  origin: 'https://bytewise24.vercel.app', // Set your frontend URL (replace with your frontend URL)
  credentials: true, // Allow cookies if needed
});

// Helper function to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Setup the database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  // Enable CORS for this API route
  await runMiddleware(req, res, cors);

  // Handle OPTIONS request (for preflight CORS check)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
    return res.status(200).end();
  }

  // Handle POST request (save order logic)
  if (req.method === 'POST') {
    const { enrolmentID, orderItems, totalPrice, transactionID } = req.body;
    const orderID = uuidv4();
    const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      // Insert the order into the orders table
      await conn.query(
        `INSERT INTO orders (orderID, enrolmentID, transactionID, order_date, total_price) VALUES (?, ?, ?, ?, ?)`,
        [orderID, enrolmentID, transactionID, orderDate, totalPrice]
      );

      // Insert the order items into the order_items table
      for (const item of orderItems) {
        await conn.query(
          `INSERT INTO order_items (orderID, productID, quantity) VALUES (?, ?, ?)`,
          [orderID, item.productID, item.quantity]
        );
      }

      // Commit the transaction
      await conn.commit();
      conn.release();

      // Return success message with the orderID
      res.status(200).json({ message: 'Order saved successfully', orderID });
    } catch (error) {
      if (conn) {
        await conn.rollback();
        conn.release();
      }
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
