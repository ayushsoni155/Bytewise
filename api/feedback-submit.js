import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Adjust frontend URL
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
  // Enable CORS for this API route
  await runMiddleware(req, res, cors);

  // Handle OPTIONS request (for preflight CORS check)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Handle POST request (feedback submission)
  if (req.method === 'POST') {
    const { enrolmentID, feedback } = req.body;

    // Log the incoming data for debugging
    console.log('Received feedback data:', { enrolmentID, feedback });

    // Validate request body
    if (!enrolmentID || !feedback) {
      console.error('Missing enrolmentID or feedback:', { enrolmentID, feedback });
      return res.status(400).json({ message: 'Enrolment ID and feedback are required' });
    }

    try {
      // Try getting a database connection
      const conn = await db.getConnection();
      console.log('Database connection successful!');

      // Prepare the SQL query
      const query = 'INSERT INTO feedback (enrolmentID, feedback) VALUES (?, ?)';
      console.log('Executing SQL query:', query, [enrolmentID, feedback]);

      // Insert feedback into the database
      const [result] = await conn.query(query, [enrolmentID, feedback]);
      conn.release();

      // Log the result of the query
      console.log('Feedback submitted:', result);

      res.status(200).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: `Server error: ${error.message || error}` });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
