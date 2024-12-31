const mongoose = require('mongoose');

const UserModel = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isSuperUser: {
        type: Boolean,
        default: false
    },
    isAdminUser: {
        type: Boolean,
        default: false
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: false, 
        default: null    
    }
});

module.exports = mongoose.model('User', UserModel);
