import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
    return res.status(200).end();
  }

  // Handle GET request (fetch order history)
  if (req.method === 'GET') {
    const { enrolmentID } = req.query;

    // Check if enrolmentID is provided
    if (!enrolmentID) {
      return res.status(400).json({ message: 'Enrolment ID is required' });
    }

    try {
      const conn = await db.getConnection();

      // Query the database for orders associated with the enrolmentID
      const [orders] = await conn.query(
        'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
        [enrolmentID]
      );
      conn.release();

      // Return the orders in the response
      res.status(200).json(orders);
    } catch (error) {
      console.error('Error fetching order history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-GET requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
