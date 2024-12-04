
import mysql from 'mysql2/promise';
import Cors from 'cors'; 

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Set your frontend URL
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

  // Handle non-GET requests
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

    // For each order, fetch the associated order items
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [orderItems] = await conn.query(
        'SELECT * FROM order_items WHERE orderID = ?',
        [order.orderID]
      );

      return {
        ...order,
        items: orderItems,  // Attach order items to the order
      };
    }));
    const [product] =  await conn.query('select * from productbw');
    conn.release();

    // Send the enhanced orders with item details
    res.status(200).json(ordersWithItems,product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
