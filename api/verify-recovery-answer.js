import Cors from 'cors';
import mysql from 'mysql2/promise';

const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Your frontend URL
  credentials: true,
});

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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(req, res) {
  try {
    console.log('Request received:', req.method, req.body);

    // Run the CORS middleware first to handle the preflight request
    await runMiddleware(req, res, cors);

    // If it's a preflight `OPTIONS` request, simply respond with 200 status
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app');
      return res.status(200).end();
    }

    if (req.method === 'POST') {
      const { userID, recoveryAnswer } = req.body;
       localStorage.setItem('enrolID', userID);
      if (!userID || !recoveryAnswer) {
        console.log('Invalid input, missing userID or recoveryAnswer');
        return res.status(400).json({ message: 'User ID and recovery answer are required' });
      }

      console.log('Checking user with userID:', userID);

      let conn;
      try {
        conn = await db.getConnection(); // Try to get a DB connection
        console.log('Database connection successful');
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        return res.status(500).json({ message: 'Database connection error' });
      }

      let results;
      try {
        [results] = await conn.query('SELECT recovery_answer FROM user_info WHERE enrolmentID = ?', [userID]);
        console.log('Query results:', results);
      } catch (queryError) {
        console.error('Query error:', queryError);
        return res.status(500).json({ message: 'Database query error' });
      } finally {
        conn.release(); // Always release the connection after usage
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'User not found' });
      }

      const storedAnswer = results[0].recovery_answer;

      if (storedAnswer !== recoveryAnswer) {
        return res.status(400).json({ message: 'Incorrect answer' });
      }

      return res.status(200).json({ message: 'Answer verified! You can now reset your password.' });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
