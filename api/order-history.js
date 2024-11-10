// server.js (Express.js Backend)

const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// Order schema and model
const orderSchema = new mongoose.Schema({
  enrolmentID: String,
  order_id: String,
  order_date: Date,
  totalPrice: Number,
  status: String,
  orderItems: [
    {
      Subject_code: String,
      item_quantity: Number,
      item_price: Number,
    },
  ],
});

const Order = mongoose.model('Order', orderSchema);

// Fetch order history for a given user
app.get('/api/order-history', async (req, res) => {
  const { enrolmentID } = req.query;

  if (!enrolmentID) {
    return res.status(400).json({ message: 'enrolmentID is required' });
  }

  try {
    const orders = await Order.find({ enrolmentID }).sort({ order_date: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching order history:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
