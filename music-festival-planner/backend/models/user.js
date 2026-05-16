const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

// Represents a registered account that can log in and, if admin, manage festival data.
const userSchema = new Schema(
  {
    // Login identifier — stored lowercase so comparisons are case-insensitive.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Hashed password; excluded from query results by default to prevent accidental leakage.
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    // Controls what the user is allowed to do — regular visitors vs. admin editors.
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    // Explicit collection name keeps naming consistent across environments.
    collection: 'users',
    // Adds createdAt/updatedAt automatically.
    timestamps: true,
  },
);

// Automatically hash the password before saving so plain text never reaches the database.
userSchema.pre('save', async function hashPassword() {
  // Skip hashing if the password field has not changed — avoids double-hashing on unrelated updates.
  if (!this.isModified('password')) return;
  // Replace the plain text password with a secure bcrypt hash before writing.
  this.password = await bcrypt.hash(this.password, 12);
});

// Check whether a login attempt's password matches the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  // Returns a promise that resolves to true if the passwords match.
  return bcrypt.compare(candidate, this.password);
};

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
