import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';  // Using Node's built-in crypto library to generate a random UUID

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

    // Generate a random feedbackID using UUID
    const feedbackID = randomUUID();
    const feedback_date = new Date();

    // Add 5 hours and 30 minutes to the current date
    feedback_date.setHours(feedback_date.getHours() + 5);
    feedback_date.setMinutes(feedback_date.getMinutes() + 30);

    // Format the feedback_date as 'YYYY-MM-DD HH:MM:SS' for MySQL DATETIME format
    const formattedfeedback_date = feedback_date.toISOString().slice(0, 19).replace('T', ' ');

    // Log the random feedbackID and the adjusted date
    console.log('Generated feedbackID:', feedbackID);
    console.log('Adjusted feedback_date:', formattedfeedback_date);

    // Get a connection from the database
    const conn = await db.getConnection();

    // Log the connection status
    console.log('Database connection established.');

    // Insert the feedback into the database, including the generated feedbackID
    const [result] = await conn.query(
      'INSERT INTO feedback (feedbackID, feedback_enrolmentID, feedback_text, feedback_date) VALUES (?, ?, ?, ?)',
      [feedbackID, enrolmentID, feedback, formattedfeedback_date]
    );

    // Log the result of the query
    console.log('Feedback inserted:', result);

    // Release the connection back to the pool
    conn.release();

    // Send success response
    return res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    // Log detailed error information
    console.error('Error during feedback submission:', error);

    // Respond with a 500 error and a generic message
    return res.status(500).json({
      message: 'Server error',
      error: error.message,  // Include error message in the response for debugging purposes
    });
  }
}
