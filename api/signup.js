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

  // Handle POST requests
  if (req.method === 'POST') {
    const { enrolmentID, name, sem, phone, password } = req.body;

    // Check if all required fields are present
    if (!name || !enrolmentID || !password || !phone || !sem) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const conn = await db.getConnection();

      // Check if the user already exists
      const [existingUser] = await conn.query(
        'SELECT enrolmentID FROM user_info WHERE enrolmentID = ?',
        [enrolmentID]
      );

      if (existingUser.length > 0) {
        conn.release();
        return res.status(400).json({ message: 'Enrolment ID already in use' });
      }

      // Hash the password using bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert the new user into the database
      await conn.query(
        'INSERT INTO user_info (enrolmentID, name, sem, phone, password) VALUES (?, ?, ?, ?, ?)',
        [enrolmentID, name, sem, phone, hashedPassword]
      );

      conn.release();
      return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
