import Cors from 'cors';

const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Your frontend URL
  credentials: true,
});
// Setup the database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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

export default async function handler(req, res) {
  // Run the CORS middleware first to handle the preflight request
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') {
    // If it's a preflight `OPTIONS` request, simply respond with 200 status
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { userID, recoveryAnswer } = req.body;

      if (!userID || !recoveryAnswer) {
        return res.status(400).json({ message: 'User ID and recovery answer are required' });
      }

      let conn;
      try {
        conn = await db.getConnection(); // Try to get a DB connection
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        return res.status(500).json({ message: 'Database connection error' });
      }

      let results;
      try {
        [results] = await conn.query('SELECT recovery_answer FROM user_info WHERE enrolmentID = ?', [userID]);
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
      redirectUrl: '/reset-password', 
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
