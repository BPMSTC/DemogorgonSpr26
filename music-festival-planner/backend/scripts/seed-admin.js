const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const User = require('../models/user');

// Usage:
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword node scripts/seed-admin.js
//
// Both values must be supplied via environment variables (set them in your .env
// file or inline on the command line).  The script is idempotent: if the email
// already exists it updates the role to 'admin' without changing the password.

// Main logic for creating or promoting an admin user account.
async function run() {
  // Read credentials from environment so they are never hard-coded in source.
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  // Both values must be present — bail early with a clear message if either is missing.
  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error(
      'Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/seed-admin.js',
    );
    process.exitCode = 1;
    return;
  }

  // Enforce the same minimum length the user model schema requires.
  if (password.length < 8) {
    console.error('Error: ADMIN_PASSWORD must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  // Open the database connection before attempting any queries.
  await connectToDatabase();

  try {
    // Check whether an account with this email already exists.
    const existing = await User.findOne({ email });

    if (existing) {
      // No work needed if the account is already an admin.
      if (existing.role === 'admin') {
        console.log(`Admin account already exists for ${email}. Nothing to do.`);
      } else {
        // Promote the existing regular user to admin without touching their password.
        existing.role = 'admin';
        await existing.save();
        console.log(`Updated existing user ${email} to role 'admin'.`);
      }
    } else {
      // Create a brand-new admin account; the model's pre-save hook will hash the password.
      const user = new User({ email, password, role: 'admin' });
      await user.save();
      console.log(`Admin account created for ${email}.`);
    }
  } finally {
    // Always disconnect when the script is done, even if an error was thrown.
    await disconnectFromDatabase();
  }
}

// Start the script and surface any unexpected failures with a non-zero exit code.
run().catch((err) => {
  console.error('seed-admin failed:', err);
  process.exitCode = 1;
});
