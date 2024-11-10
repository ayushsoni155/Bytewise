// api/order-history.js
import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST'],
  origin: ['https://your-frontend-domain.com', 'http://localhost:3000'], // Allow specific origins (frontend domains)
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Helper function to run middleware
function runCors(req, res, next) {
  cors(req, res, (result) => {
    if (result instanceof Error) {
      return next(result);
    }
    next();
  });
}

export default async function handler(req, res) {
  // Run the CORS middleware
  runCors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { enrolmentID } = req.query;

    if (!enrolmentID) {
      return res.status(400).json({ message: 'Enrolment ID is required' });
    }

    try {
      const conn = await db.getConnection();
      const [orders] = await conn.query(
        'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
        [enrolmentID]
      );
      conn.release();

      res.status(200).json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
}
