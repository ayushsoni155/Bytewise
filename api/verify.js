import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
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
  try {
    // Enable CORS for this API route
    await runMiddleware(req, res, cors);

    // Handle OPTIONS request (preflight check)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Handle POST requests
    if (req.method === 'POST') {
      const { enrolmentID, name, sem, phone } = req.body;

      // Validate input data
      if (!enrolmentID || !name || !sem || !phone) {
        return res.status(400).json({ message: 'Incomplete data provided' });
      }

      const conn = await db.getConnection(); // Get a database connection

      try {
        // Query the database for user data
        const [results] = await conn.query(
          'SELECT name, sem, phone FROM user_info WHERE enrolmentID = ?',
          [enrolmentID]
        );

        // Release the connection back to the pool
        conn.release();

        // Check if the user exists
        if (results.length === 0) {
          return res.status(401).json({ message: 'User not found' });
        }

        const user = results[0];

        // Verify if the cookie data matches the database record
        if (user.name !== name || user.sem !== sem || user.phone !== phone) {
          return res.status(401).json({ message: 'Cookie data mismatch. Logging out.' });
        }

        // Return success response if data matches
        return res.status(200).json({ message: 'Cookie data verified' });
      } catch (error) {
        conn.release(); // Ensure the connection is released in case of error
        console.error('Database query error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
    }

    // Handle other HTTP methods
    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
