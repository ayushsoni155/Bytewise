import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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

  // Handle POST request (reset password logic)
  if (req.method === 'POST') {
    const { enrolmentID, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!enrolmentID || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate that the passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate password strength (at least 8 characters, contains both letters and numbers)
    const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
    }

    try {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Connect to the database and update the password
      const conn = await db.getConnection();
      await conn.query('UPDATE user_info SET password = ? WHERE enrolmentID = ?', [hashedPassword, enrolmentID]);
      conn.release();

      // Return success message
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
