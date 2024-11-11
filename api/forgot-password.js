import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Set your frontend URL
  credentials: true,
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
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

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
        'SELECT enrolmentID, phone, recovery_question, recovery_answer FROM user_info WHERE enrolmentID = ? AND phone = ?',
        [enrolmentID, phone]
      );

      conn.release();

      // If no matching records are found
      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid enrolment ID or phone number' });
      }

      const user = results[0];

      // If a match is found, return the recovery question
      return res.status(200).json({
        message: 'Verification successful! Please answer the recovery question.',
        recoveryQuestion: user.recovery_question, // Send recovery question to the frontend
        userID: user.enrolmentID, // Send user ID for further use (e.g., resetting password)
      });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
