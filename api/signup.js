import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'], // Allow 'Content-Type' header in the request
  origin: 'https://bytewise24.vercel.app', // Replace with your actual frontend URL
  credentials: true, // Allow credentials (cookies, authorization headers)
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

// Set up database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  // Enable CORS for this API route
  await runMiddleware(req, res, cors);

  // Handle OPTIONS requests (preflight request)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle non-POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID, name, sem, phone, password } = req.body;

  // Check for missing fields
  if (!name || !enrolmentID || !password || !phone || !sem) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Get database connection
    const conn = await db.getConnection();

    // Check if user already exists
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
