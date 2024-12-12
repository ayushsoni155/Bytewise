import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
    return res.status(200).end();
  }

  // Handle GET requests (fetch lab manuals)
  if (req.method === 'GET') {
    try {
     const [results] = await db.query('SELECT * FROM productbw WHERE subject_code NOT IN (?, ?, ?)', ['CS508', 'CS509', 'CS510']);
// Correct syntax for the query
      return res.status(200).json(results);
    } catch (error) {
      console.error('Error fetching lab manuals:', error.message);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Handle non-GET requests
  res.setHeader('Allow', ['GET', 'OPTIONS']);
  return res.status(405).json({ message: 'Method Not Allowed' });
}
