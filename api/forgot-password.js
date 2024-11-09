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

  // Handle POST request (Forgot Password Verification)
  if (req.method === 'POST') {
    const { enrolmentID, phone } = req.body;

    // Check if both enrolmentID and phone are provided
    if (!enrolmentID || !phone) {
      return res.status(400).json({ message: 'Enrollment ID and phone number are required' });
    }

    try {
      const conn = await db.getConnection();

      // Check if the enrolmentID and phone match a record in the database
      const [results] = await conn.query(
        'SELECT * FROM user_info WHERE enrolmentID = ? AND phone = ?',
        [enrolmentID, phone]
      );
      conn.release();

      // If no matching records are found
      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid enrolment ID or phone number' });
      }

      // If a match is found, return a success message
      res.status(200).json({ message: 'Verification successful! You can now reset your password.' });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
