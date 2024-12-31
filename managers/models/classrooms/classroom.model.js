const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true, 
  },
  resources: {
    type: [String],
    default: [],
  },
  isSmartClassroom: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Classroom', classroomSchema);
