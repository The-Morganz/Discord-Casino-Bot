const mongoose = require('mongoose');

const userXPSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    multiplier: { type: Number, default: 1 },
    nextLevelXpReq: { type: Number, default: 100 }
});

const UserXP = mongoose.model('UserXP', userXPSchema);
module.exports = UserXP;