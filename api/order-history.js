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
  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Enable CORS for other requests
  await runMiddleware(req, res, cors);

  // Handle GET requests for order history
  if (req.method === 'GET') {
    const { enrolmentId } = req.query;

    // Ensure enrolmentId is provided
    if (!enrolmentId) {
      return res.status(400).json({ message: 'Enrolment ID is required' });
    }

    try {
      // Log incoming request for debugging
      console.log('Fetching order history for enrolmentId:', enrolmentId);

      // Establish a connection to the database
      const conn = await db.getConnection();

      // Query to fetch the order history
      const [orders] = await conn.query(
        'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
        [enrolmentId]
      );

      // Log the result of the query for debugging
      console.log('Order history fetched:', orders);

      // Release the connection back to the pool
      conn.release();

      // Return the fetched order history
      return res.status(200).json(orders);
    } catch (error) {
      // Log the error with full details for debugging
      console.error('Error fetching order history:', error);

      // Return a server error message
      return res.status(500).json({ message: 'Server error, please try again later.' });
    }
  }

  // Handle any other method (e.g., POST, PUT, DELETE)
  return res.status(405).json({ message: 'Method Not Allowed' });
}
