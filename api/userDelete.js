import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: 'https://admin-bytewise24.vercel.app', // Your frontend URL
  methods: ['DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow cookies or credentials
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

    // Handle OPTIONS request (for preflight CORS check)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://admin-bytewise24.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(200).end();
    }

    // Handle DELETE requests
    if (req.method === 'DELETE') {
      // Parse the request body
      const body = req.body;
      const { enrolmentID } = typeof body === 'string' ? JSON.parse(body) : body;

      // Validate input
      if (!enrolmentID) {
        return res.status(400).json({ error: 'Enrollment ID is required.' });
      }

      // Query to delete the user by enrollment ID
      const query = `DELETE FROM user_info WHERE enrolmentID = ?`;
      const [result] = await db.query(query, [enrolmentID]);

      // Check if any row was affected
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Return success response
      res.setHeader('Access-Control-Allow-Origin', 'https://admin-bytewise24.vercel.app'); // Include CORS headers in responses
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(200).json({ message: 'User deleted successfully.' });
    }

    // Handle unsupported HTTP methods
    res.setHeader('Access-Control-Allow-Origin', 'https://admin-bytewise24.vercel.app'); // Include CORS headers in error responses
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Server error:', error);
    res.setHeader('Access-Control-Allow-Origin', 'https://admin-bytewise24.vercel.app'); // Include CORS headers in error responses
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
}
