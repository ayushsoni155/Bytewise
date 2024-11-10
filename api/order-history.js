import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'], // Allow GET, POST, OPTIONS methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
  origin: 'https://bytewise24.vercel.app', // Your frontend URL (adjust this if different)
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
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

// Create the MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Your frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials
    return res.status(200).end(); // Respond with 200 to allow the request
  }

  // Enable CORS for other requests
  await runMiddleware(req, res, cors);

  // Handle non-GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID } = req.query;

  // Check if enrolmentID is provided
  if (!enrolmentID) {
    return res.status(400).json({ message: 'Enrolment ID is required' });
  }

  try {
    // Get database connection
    const conn = await db.getConnection();

    // Query orders based on enrolmentID
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
      [enrolmentID]
    );

    // Release the connection after the query
    conn.release();

    // Respond with the orders data
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
