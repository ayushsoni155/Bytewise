export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { userID, recoveryAnswer } = req.body;
  
      if (!userID || !recoveryAnswer) {
        return res.status(400).json({ message: 'User ID and recovery answer are required' });
      }
  
      try {
        const conn = await db.getConnection();
  
        // Fetch the stored recovery answer from the database
        const [results] = await conn.query(
          'SELECT recovery_answer FROM user_info WHERE enrolmentID = ?',
          [userID]
        );
        conn.release();
  
        if (results.length === 0) {
          return res.status(400).json({ message: 'User not found' });
        }
  
        // Check if the provided answer matches the stored answer
        const storedAnswer = results[0].recovery_answer;
  
        if (storedAnswer !== recoveryAnswer) {
          return res.status(400).json({ message: 'Incorrect answer' });
        }
  
        // If the answer is correct
        return res.status(200).json({ message: 'Answer verified! You can now reset your password.' });
      } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  