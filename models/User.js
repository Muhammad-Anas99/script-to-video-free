const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: String, // empty for accounts that only use Google
    googleId: { type: String, index: true, sparse: true },
    avatar: String, // a small picture, or a Google profile picture link
    privacyAcceptedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
