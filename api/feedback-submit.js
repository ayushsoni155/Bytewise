import mysql from 'mysql2/promise';

// Set up your database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Helper function to run CORS middleware
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Replace with your frontend URL
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow headers
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
}

export default async function handler(req, res) {
  // Handle preflight CORS (OPTIONS) request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end(); // Respond with 200 status for OPTIONS preflight
  }

  // Enable CORS for other requests
  setCorsHeaders(res);

  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { enrolmentID, feedback } = req.body;

  if (!enrolmentID || !feedback) {
    return res.status(400).json({ message: 'Enrolment ID and feedback are required' });
  }

  try {
    const conn = await db.getConnection();

    // Log query and params for debugging
    console.log('Inserting feedback:', { enrolmentID, feedback });

    // Attempt to insert the feedback into the database
    await conn.query(
      'INSERT INTO feedback (enrolmentID, feedback) VALUES (?, ?)',
      [enrolmentID, feedback]
    );

    conn.release();
    return res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    // Log error for debugging
    console.error('Error inserting feedback:', error.message);
    console.error('Stack trace:', error.stack);

    // Return a generic server error response
    return res.status(500).json({ message: 'Server error' });
  }
}
