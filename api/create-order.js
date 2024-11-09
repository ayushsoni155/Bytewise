import Razorpay from 'razorpay';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers (adjust as needed)
  origin: 'https://bytewise24.vercel.app', // Set your frontend URL
  credentials: true, // Allow cookies if needed
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

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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

  // Handle POST request for creating Razorpay order
  if (req.method === 'POST') {
    const { amount } = req.body;

    // Check if amount is provided
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    // Razorpay order options
    const options = {
      amount: amount, // Convert amount to paise (Razorpay expects amount in paise)
      currency: 'INR', // Set currency to INR
      receipt: 'receipt_order_' + Math.floor(Math.random() * 1000000), // Random receipt ID
    };

    try {
      // Create Razorpay order
      const order = await razorpay.orders.create(options);
      res.status(200).json(order); // Send the order details back to the client
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Handle non-POST requests
  return res.status(405).json({ message: 'Method Not Allowed' });
}
