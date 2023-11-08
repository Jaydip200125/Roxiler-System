const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Define your MongoDB connection and schema for transactions
mongoose.connect('mongodb://localhost/your-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const transactionSchema = new mongoose.Schema({
  dateOfSale: String,
  productTitle: String,
  productDescription: String,
  price: Number,
  category: String,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Mock data initialization (replace with your own data fetching logic)
app.get('/initialize-database', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const data = response.data;

    await Transaction.collection.insertMany(data);

    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize database' });
  }
});

// List all transactions
app.get('/list-transactions', async (req, res) => {
  const { month, search, page = 1, perPage = 10 } = req.query;
  const skip = (page - 1) * perPage;

  const query = {
    dateOfSale: { $regex: `.*-${month}-.*` },
    $or: [
      { productTitle: { $regex: search, $options: 'i' } },
      { productDescription: { $regex: search, $options: 'i' } },
      { price: { $regex: search, $options: 'i' } },
    ],
  };

  const totalRecords = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query).skip(skip).limit(perPage);

  res.status(200).json({ transactions, totalRecords });
});

// Statistics
app.get('/statistics', async (req, res) => {
  const { month } = req.query;

  const totalSaleAmount = await Transaction.aggregate([
    { $match: { dateOfSale: { $regex: `.*-${month}-.*` } } },
    { $group: { _id: null, totalAmount: { $sum: '$price' } } },
  ]);

  const totalSoldItems = await Transaction.countDocuments({
    dateOfSale: { $regex: `.*-${month}-.*` },
  });

  const totalNotSoldItems = await Transaction.countDocuments({
    dateOfSale: { $regex: `.*-${month}-.*` },
    // Add criteria to identify not sold items
  });

  res.status(200).json({ totalSaleAmount, totalSoldItems, totalNotSoldItems });
});

// Bar Chart
app.get('/bar-chart', async (req, res) => {
  const { month } = req.query;

  const priceRanges = [
    { range: '0 - 100', count: 0 },
    { range: '101 - 200', count: 0 },
    // Add more price ranges as needed
  ];

  const transactions = await Transaction.find({
    dateOfSale: { $regex: `.*-${month}-.*` },
  });

  transactions.forEach((transaction) => {
    const price = parseInt(transaction.price);
    if (price >= 0 && price <= 100) {
      priceRanges[0].count++;
    } else if (price >= 101 && price <= 200) {
      priceRanges[1].count++;
    }
    // Add more conditions for other price ranges
  });

  res.status(200).json(priceRanges);
});

// Pie Chart
app.get('/pie-chart', async (req, res) => {
  const { month } = req.query;

  const categoryCounts = {};

  const transactions = await Transaction.find({
    dateOfSale: { $regex: `.*-${month}-.*` },
  });

  transactions.forEach((transaction) => {
    const category = transaction.category;
    if (category in categoryCounts) {
      categoryCounts[category]++;
    } else {
      categoryCounts[category] = 1;
    }
  });

  res.status(200).json(categoryCounts);
});

// Combined Response
app.get('/combined-data', async (req, res) => {
  try {
    const initializeResponse = await axios.get('http://localhost:5000/initialize-database');
    const listTransactionsResponse = await axios.get('http://localhost:5000/list-transactions');
    const statisticsResponse = await axios.get('http://localhost:5000/statistics');
    const barChartResponse = await axios.get('http://localhost:5000/bar-chart');
    const pieChartResponse = await axios.get('http://localhost:5000/pie-chart');

    // Combine responses as needed

    res.status(200).json({ message: 'Combined response' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combined data' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
