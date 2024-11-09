import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers (adjust as needed)
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

  // Handle OPTIONS request (for preflight CORS check)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
    return res.status(200).end();
  }

  // Handle POST requests (login)
  if (req.method === 'POST') {
    const { enrolmentID, password } = req.body;

    // Check if both enrolmentID and password are provided
    if (!enrolmentID || !password) {
      return res.status(400).json({ message: 'Enrollment ID and password are required' });
    }

    try {
      const conn = await db.getConnection();

      // Query for the user with the provided enrolmentID
      const [results] = await conn.query(
        'SELECT * FROM user_info WHERE enrolmentID = ?',
        [enrolmentID]
      );

      // If no user is found with the provided enrolmentID
      if (results.length === 0) {
        conn.release();
        return res.status(400).json({ message: 'Invalid enrolment ID or password' });
      }

      const user = results[0];

      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
      conn.release();

      // If the password doesn't match
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid enrolment ID or password' });
      }

      // Remove password from the response object
      const { password: _, ...userData } = user;

      // Return success response with user data (excluding password)
      return res.status(200).json({ message: 'Login successful', user: userData });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
