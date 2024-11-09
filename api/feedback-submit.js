import mysql from 'mysql2/promise';

// Set up your database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Helper function to set CORS headers
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

  // Check if enrolmentID and feedback are provided
  if (!enrolmentID || !feedback) {
    return res.status(400).json({ message: 'Enrolment ID and feedback are required' });
  }

  try {
    // Log incoming data
    console.log('Received data:', { enrolmentID, feedback });

    // Get a connection from the database
    const conn = await db.getConnection();

    // Log the connection status
    console.log('Database connection established.');

    // Insert the feedback into the database
    const [result] = await conn.query(
      'INSERT INTO feedback (feedback_enrolmentID, feedback_text) VALUES (?, ?)',
      [enrolmentID, feedback]
    );
    
    // Log the result of the query
    console.log('Feedback inserted:', result);

    // Release the connection back to the pool
    conn.release();

    // Send success response
    return res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    // Log detailed error information
    console.error('Error during feedback submission:', error.message);
    console.error('Stack trace:', error.stack);

    // Respond with a 500 error and a generic message
    return res.status(500).json({
      message: 'Server error',
      error: error.message,  // Include error message in the response for debugging purposes
    });
  }
}
