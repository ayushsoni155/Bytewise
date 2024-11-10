import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'], // Allow GET, POST, OPTIONS methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
  origin: 'https://bytewise24.vercel.app', // Allow your frontend domain
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

// Database connection pool
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
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Allow your frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies)
    return res.status(200).end(); // Respond with status 200
  }

  // Enable CORS for other requests
  await runMiddleware(req, res, cors);

  // Handle GET requests for order history
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentId } = req.query;

  if (!enrolmentId) {
    return res.status(400).json({ message: 'Enrolment ID is required' });
  }

  try {
    // Establish a connection to the database
    const conn = await db.getConnection();

    // Query for fetching the order history
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
      [enrolmentId]
    );

    // Release the connection back to the pool
    conn.release();

    // Return the order history
    return res.status(200).json(orders);
  } catch (error) {
    // Log and handle any errors
    console.error('Error fetching order history:', error);

    // Return server error message with a status code of 500
    return res.status(500).json({ message: 'Server error, please try again later.' });
  }
}
