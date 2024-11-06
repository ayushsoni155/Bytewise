// const express = require('express');
// const bodyParser = require('body-parser');
// const bcrypt = require('bcryptjs');
// const mysql = require('mysql2/promise');
// const cors = require('cors');
// const Razorpay = require('razorpay');
// const { v4: uuidv4 } = require('uuid');

// // Initialize Express app
// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // Create MySQL Connection Pool
// const db = mysql.createPool({
//     host: 'localhost',
//     user: 'root', // 
//     password: 'root', // 
//     database: 'bytewise_db' 
// });

// // Signup route
// app.post('/signup', async (req, res) => {
//     const { enrolmentID, name, sem, phone, password } = req.body;

//     if (!name || !enrolmentID || !password || !phone || !sem) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     try {
//         const conn = await db.getConnection();

//         // Check if user exists
//         const [existingUser] = await conn.query('SELECT enrolmentID FROM user_info WHERE enrolmentID = ?', [enrolmentID]);
//         if (existingUser.length > 0) {
//             conn.release();
//             return res.status(400).json({ message: 'Enrolment already in use' });
//         }

//         // Hash the password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         // Insert new user
//         await conn.query(
//             'INSERT INTO user_info (enrolmentID, name, sem, phone, password) VALUES (?, ?, ?, ?, ?)',
//             [enrolmentID, name, sem, phone, hashedPassword]
//         );

//         conn.release();
//         res.status(201).json({ message: 'User registered successfully' });
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Login route
// app.post('/login', async (req, res) => {
//     const { enrolmentID, password } = req.body;

//     if (!enrolmentID || !password) {
//         return res.status(400).json({ message: 'Enrollment ID and password are required' });
//     }

//     try {
//         const conn = await db.getConnection();
//         const [results] = await conn.query('SELECT * FROM user_info WHERE enrolmentID = ?', [enrolmentID]);

//         if (results.length === 0) {
//             conn.release();
//             return res.status(400).json({ message: 'Invalid enrolment ID or password' });
//         }

//         const user = results[0];
//         const isMatch = await bcrypt.compare(password, user.password);
//         conn.release();

//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid enrolment ID or password' });
//         }

//         const { password: _, ...userData } = user;
//         res.status(200).json({ message: 'Login successful', user: userData });
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Forgot Password route
// app.post('/forgot-password', async (req, res) => {
//     const { enrolmentID, phone } = req.body;

//     if (!enrolmentID || !phone) {
//         return res.status(400).json({ message: 'Enrollment ID and phone number are required' });
//     }

//     try {
//         const conn = await db.getConnection();
//         const [results] = await conn.query('SELECT * FROM user_info WHERE enrolmentID = ? AND phone = ?', [enrolmentID, phone]);
//         conn.release();

//         if (results.length === 0) {
//             return res.status(400).json({ message: 'Invalid enrolment ID or phone number' });
//         }

//         res.status(200).json({ message: 'Verification successful! You can now reset your password.' });
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Reset Password route
// app.post('/reset-password', async (req, res) => {
//     const { enrolmentID, newPassword, confirmPassword } = req.body;

//     if (!enrolmentID || !newPassword || !confirmPassword) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     if (newPassword !== confirmPassword) {
//         return res.status(400).json({ message: 'Passwords do not match' });
//     }

//     const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/;
//     if (!passwordRegex.test(newPassword)) {
//         return res.status(400).json({ message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
//     }

//     try {
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(newPassword, salt);

//         const conn = await db.getConnection();
//         await conn.query('UPDATE user_info SET password = ? WHERE enrolmentID = ?', [hashedPassword, enrolmentID]);
//         conn.release();

//         res.status(200).json({ message: 'Password reset successful' });
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Razorpay configuration and create-order route
// const razorpay = new Razorpay({
//     key_id: 'rzp_test_7PpL3w409po5NZ',
//     key_secret: 'k7aRE3wtvX3kRjkJPoPO5mkg'
// });

// app.post('/create-order', async (req, res) => {
//     const amount = req.body.amount;
//     const options = {
//         amount: amount,
//         currency: 'INR',
//         receipt: 'receipt_order_' + Math.floor(Math.random() * 1000000)
//     };

//     try {
//         const order = await razorpay.orders.create(options);
//         res.json(order);
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });

// app.post('/save-order', async (req, res) => {
//     const { enrolmentID, orderItems, totalPrice, transactionID } = req.body; // Expect transactionID in the request body
//     const orderID = uuidv4(); // Unique ID for the order
//     const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

//     let conn;

//     try {
//         // Get connection from pool and begin transaction
//         conn = await db.getConnection();
//         await conn.beginTransaction();

//         // Insert into orders table
//         await conn.query(
//             `INSERT INTO orders (orderID, enrolmentID, transactionID, order_date, total_price) VALUES (?, ?, ?, ?, ?)`,
//             [orderID, enrolmentID, transactionID, orderDate, totalPrice]
//         );

//         // Insert each item in order_items table
//         for (const item of orderItems) {
//             const orderItemID = uuidv4();
//             await conn.query(
//                 `INSERT INTO order_items (order_itemsID, orderID, subject_code, item_quantity, item_price) VALUES (?, ?, ?, ?, ?)`,
//                 [orderItemID, orderID, item.Subject_code, item.item_quantity, item.item_price]
//             );
//         }

//         // Commit the transaction if all inserts succeed
//         await conn.commit();
//         res.status(200).json({ message: 'Order saved successfully', orderID, transactionID });
//     } catch (error) {
//         // Rollback transaction in case of an error
//         if (conn) await conn.rollback();
//         console.error('Order save failed:', error);
//         res.status(500).json({ message: 'Failed to save order' });
//     } finally {
//         if (conn) conn.release(); // Release the connection back to the pool
//     }
// });

// // Order history route
// app.get('/order-history', async (req, res) => {
//     const { enrollmentId } = req.query; // Get enrollment ID from query parameters

//     if (!enrollmentId) {
//         return res.status(400).json({ message: 'Enrollment ID is required' });
//     }

//     try {
//         const conn = await db.getConnection();

//         // Fetch order details for the user
//         const [orders] = await conn.query(
//             `SELECT orderID, order_date, total_price FROM orders WHERE enrolmentID = ? ORDER BY order_date DESC`,
//             [enrollmentId]
//         );

//         // Fetch items for each order
//         const orderHistory = await Promise.all(orders.map(async (order) => {
//             const [items] = await conn.query(
//                 `SELECT subject_code, item_quantity, item_price FROM order_items WHERE orderID = ?`,
//                 [order.orderID]
//             );
//             return {
//                 ...order,
//                 items
//             };
//         }));

//         conn.release();
//         res.status(200).json(orderHistory);
//     } catch (error) {
//         console.error('Order history fetch error:', error);
//         res.status(500).json({ message: 'Server error while fetching order history' });
//     }
// });

// app.post('/feedback-submit', async (req, res) => {
//     const { name, enrolmentID, message } = req.body;

//     if (!name || !enrolmentID || !message.trim()) {
//         return res.status(400).json({ error: 'All fields are required.' });
//     }

//     const feedbackID = `fb_${Date.now()}`;
//     const query = `INSERT INTO feedback (feedbackID, feedback_enrolmentID, feedback_text) VALUES (?, ?, ?)`;

//     let conn;
//     try {
//         conn = await db.getConnection();
//         await conn.query(query, [feedbackID, enrolmentID, message]);
//         res.status(200).json({ message: 'Feedback submitted successfully!' });
//     } catch (err) {
//         console.error('Error inserting feedback:', err);
//         res.status(500).json({ error: 'Database error.' });
//     } finally {
//         if (conn) conn.release();
//     }
// });


// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


// Initialize Express app
const app = express();

// CORS options to allow only requests from the frontend domain
const corsOptions = {
  origin: 'https://bytewise24.vercel.app', // Frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies, authorization headers, etc.
};

// Use CORS middleware with options
app.use(cors(corsOptions));

// Middleware for parsing JSON
app.use(bodyParser.json());

// Create MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
});

// POST route for signup
app.post('/signup', async (req, res) => {
  const { enrolmentID, name, sem, phone, password } = req.body;

  if (!enrolmentID || !name || !sem || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user details into the database
    const [result] = await db.execute(
      'INSERT INTO user_info(enrolmentID, name, sem, phone, password) VALUES (?, ?, ?, ?, ?)',
      [enrolmentID, name, sem, phone, hashedPassword]
    );

    res.status(201).json({
      message: 'Signup successful',
      userId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup. Please try again.' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
