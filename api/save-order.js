import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app',
  credentials: true,
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

// Function to generate a short unique ID
function generateShortId() {
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const randomPart = Math.random().toString(36).substring(2, 8); // Random 6 characters
  return `${timestamp}${randomPart}`; // Combine for a short unique ID
}

// Set up the database connection pool
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
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Handle POST request (save order logic)
  if (req.method === 'POST') {
    const { enrolmentID, orderItems, payment_Method, paymentStatus, totalPrice, transactionID } = req.body;

    // Ensure all fields are present
    if (!enrolmentID || !orderItems || !payment_Method || !paymentStatus || !totalPrice || !transactionID) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const orderID = generateShortId(); // Use the new short ID generator

    // Create the order date and add 5 hours and 30 minutes
    const orderDate = new Date();
    const formattedOrderDate = orderDate.toISOString().slice(0, 19).replace('T', ' ');

    let conn;

    try {
      // Log incoming data for debugging

      conn = await db.getConnection();
      await conn.beginTransaction();

      // Insert the order into the orders table
      const [orderResult] = await conn.query(
        `INSERT INTO bytewise_db.orders (orderID, enrolmentID, payment_Method, transactionID, order_date, paymentStatus total_price, completeStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderID, enrolmentID, payment_Method, transactionID, formattedOrderDate, paymentStatus, totalPrice, 'Pending']
      );

      // Log result of inserting order
      console.log('Inserted order:', orderResult);

      // Insert the order items into the order_items table
      for (const item of orderItems) {
        const orderItemsID = generateShortId(); // Generate a short ID for each order item

        const [itemResult] = await conn.query(
          `INSERT INTO order_items (order_itemsID, orderID, subject_code, item_quantity, item_price) VALUES (?, ?, ?, ?, ?)`,
          [orderItemsID, orderID, item.Subject_code, item.item_quantity, item.item_price]
        );

        // Log result of inserting each item
        console.log('Inserted order item:', itemResult);
      }

      // Commit the transaction
      await conn.commit();
      conn.release();

      // Return success message with the orderID
      return res.status(200).json({ message: 'Order saved successfully', orderID });

    } catch (error) {
      if (conn) {
        await conn.rollback();
        conn.release();
      }

      // Log error details
      console.error('Error during order saving:', error.message);
      console.error('Stack trace:', error.stack);

      // Return error message
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
