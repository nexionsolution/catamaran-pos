const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const app = require('../backend/server');
const mongoose = require('mongoose');

let isConnected = false;

async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is missing');
  }
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    retryWrites: false
  });
  isConnected = true;
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('MongoDB Atlas connection error in serverless function:', err);
  }
  return app(req, res);
};
