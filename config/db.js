const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '' && !uri.includes('127.0.0.1') && !uri.includes('localhost')) {
    // Only attempt live connection if a real remote URI (e.g. MongoDB Atlas) is provided
    try {
      console.log('Attempting connection to MongoDB Atlas...');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timed out')), 8000)
      );

      await Promise.race([
        mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }),
        timeoutPromise
      ]);

      isConnected = true;
      console.log(' MongoDB connected successfully.');
      return;
    } catch (err) {
      console.warn('⚠️ Remote MongoDB connection failed (' + err.message + ').');
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ In production on Render, ensure MONGODB_URI is correctly configured.');
      }
    }
  } else if (uri && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    // For local URI, quick probe
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Local MongoDB not running')), 800)
      );
      await Promise.race([
        mongoose.connect(uri, { serverSelectionTimeoutMS: 800 }),
        timeoutPromise
      ]);
      isConnected = true;
      console.log(' Connected to local MongoDB.');
      return;
    } catch (e) {
      console.log('ℹ️ Local MongoDB instance not detected on port 27017.');
    }
  }

  console.log('⚡ Running in Standalone In-Memory mode. Preloaded with realistic LaboTrack seed data.');
};

const isDBConnected = () => isConnected;

module.exports = { connectDB, isDBConnected };
