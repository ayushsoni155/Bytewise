import Cors from 'cors';

const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Replace with your frontend URL
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

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    const { userID, recoveryAnswer } = req.body;

    if (!userID || !recoveryAnswer) {
      return res.status(400).json({ message: 'User ID and recovery answer are required' });
    }

    try {
      const conn = await db.getConnection();

      const [results] = await conn.query(
        'SELECT recovery_answer FROM user_info WHERE enrolmentID = ?',
        [userID]
      );
      conn.release();

      if (results.length === 0) {
        return res.status(400).json({ message: 'User not found' });
      }

      const storedAnswer = results[0].recovery_answer;

      if (storedAnswer !== recoveryAnswer) {
        return res.status(400).json({ message: 'Incorrect answer' });
      }

      return res.status(200).json({ message: 'Answer verified! You can now reset your password.' });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
