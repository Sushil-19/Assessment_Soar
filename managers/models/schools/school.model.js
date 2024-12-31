const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  principal: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  numberOfStudents: {
    type: Number,
    required: true
  },
  establishedYear: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('School', schoolSchema);
