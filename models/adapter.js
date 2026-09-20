const mongoose = require('mongoose');
const store = require('./store');

// Check if Mongoose is actively connected to MongoDB
const isLiveMongo = () => mongoose.connection.readyState === 1;

module.exports = {
  isLiveMongo,
  store
};
