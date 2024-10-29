const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    freeSpins: { type: Number, default: 0 },
    freeSpinsBetAmount: { type: Number, default: 0 } // Ensure this field is defined here
});

const User = mongoose.model('User', userSchema);
module.exports = User;
