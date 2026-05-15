const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const User = require('../models/user');

// Diagnostic script that looks up an admin account and optionally tests a password against it.
async function run() {
  // Connect to the database before any queries can run.
  await connectToDatabase();

  // Read the target email from the environment so the script works in any environment.
  const email = process.env.ADMIN_EMAIL || 'your@email.com';

  // Must explicitly select password since it has select:false on the schema.
  const user = await User.findOne({ email }).select('+password');

  // Nothing to check if no account exists for this email.
  if (!user) {
    console.log(`No user found for email: ${email}`);
    await disconnectFromDatabase();
    return;
  }

  // Print the account details so they can be visually confirmed.
  console.log(`Found user: ${user.email}, role: ${user.role}`);
  // Show the stored hash so the developer can verify it looks like a bcrypt hash.
  console.log(`Password hash stored: ${user.password}`);

  // Only attempt a password check when a test password was provided.
  const testPassword = process.env.ADMIN_PASSWORD;
  if (testPassword) {
    // Run bcrypt comparison and report whether the plaintext matches the hash.
    const match = await user.comparePassword(testPassword);
    console.log(`Password "${testPassword}" matches: ${match}`);
  }

  // Always close the connection when the script finishes.
  await disconnectFromDatabase();
}

// Start the check and surface any unexpected errors without crashing silently.
run().catch((err) => {
  console.error('check-admin failed:', err.message);
  process.exitCode = 1;
});
