const app = require('../backend/server');
const mongoose = require('mongoose');

const DEFAULT_MONGODB_URI =
  'mongodb+srv://catamaran_app_user:CatamaranPosSystem@cluster0.xopp0.mongodb.net/catamaran_pos?retryWrites=true&w=majority';

let isConnected = false;

async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
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
