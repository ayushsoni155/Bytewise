// import mysql from 'mysql2/promise';
// import Cors from 'cors';

// // Initialize CORS middleware
// const cors = Cors({
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers (adjust as needed)
//   origin: 'https://bytewise24.vercel.app', // Set your frontend URL (replace with your frontend URL)
//   credentials: true, // Allow cookies if needed
// });

// // Helper function to run middleware
// function runMiddleware(req, res, fn) {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) {
//         return reject(result);
//       }
//       return resolve(result);
//     });
//   });
// }

// // Setup the database connection pool
// const db = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

// export default async function handler(req, res) {
//   // Enable CORS for this API route
//   await runMiddleware(req, res, cors);

//   // Handle OPTIONS request (for preflight CORS check)
//   if (req.method === 'OPTIONS') {
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
//     res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
//     return res.status(200).end();
//   }

//   // Handle GET request (fetch order history)
//   if (req.method === 'GET') {
//     const { enrolmentID } = req.query;

//     // Check if enrolmentID is provided
//     if (!enrolmentID) {
//       return res.status(400).json({ message: 'Enrolment ID is required' });
//     }

//     try {
//       const conn = await db.getConnection();

//       // Query the database for orders associated with the enrolmentID
//       const [orders] = await conn.query(
//         'SELECT * FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC',
//         [enrolmentID]
//       );
//       conn.release();

//       // Return the orders in the response
//       res.status(200).json(orders);
//     } catch (error) {
//       console.error('Error fetching order history:', error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   }

//   // Handle non-GET requests
//   return res.status(405).json({ message: 'Method Not Allowed' });
// }
import mysql from 'mysql2/promise';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  origin: 'https://bytewise24.vercel.app', // Set your frontend URL
  credentials: true,
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Origin', 'https://bytewise24.vercel.app'); // Set the frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials (cookies, etc.)
    return res.status(200).end();
  }

  // Handle GET request (fetch order history)
  if (req.method === 'GET') {
    const { enrolmentID } = req.query;

    // Check if enrolmentID is provided
    if (!enrolmentID) {
      return res.status(400).json({ message: 'Enrolment ID is required' });
    }

    try {
      const conn = await db.getConnection();

      // Query to fetch orders along with order items using JOIN
      const [orders] = await conn.query(
        `
        SELECT o.orderID, o.order_date, o.total_price, oi.subject_code, oi.item_quantity, oi.item_price
        FROM orders o
        LEFT JOIN order_items oi ON o.orderID = oi.orderID
        WHERE o.enrolmentID = ?
        ORDER BY o.order_date DESC
        `,
        [enrolmentID]
      );
      conn.release();

      // Organize orders with their items
      const organizedOrders = orders.reduce((acc, order) => {
        const { orderID, order_date, total_price, subject_code, item_quantity, item_price } = order;

        if (!acc[orderID]) {
          acc[orderID] = {
            orderID,
            order_date,
            total_price,
            items: [],
          };
        }

        if (subject_code) {
          acc[orderID].items.push({
            subject_code,
            item_quantity,
            item_price,
          });
        }

        return acc;
      }, {});

      // Convert object back to array and send the response
      const responseOrders = Object.values(organizedOrders);

      // Return the orders in the response
      res.status(200).json(responseOrders);
    } catch (error) {
      console.error('Error fetching order history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Handle non-GET requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
