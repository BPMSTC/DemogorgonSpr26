const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const User = require('../models/user');

// Usage:
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword node scripts/seed-admin.js
//
// Both values must be supplied via environment variables (set them in your .env
// file or inline on the command line).  The script is idempotent: if the email
// already exists it updates the role to 'admin' without changing the password.

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/seed-admin.js');
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error('Error: ADMIN_PASSWORD must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  await connectToDatabase();

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`Admin account already exists for ${email}. Nothing to do.`);
      } else {
        existing.role = 'admin';
        await existing.save();
        console.log(`Updated existing user ${email} to role 'admin'.`);
      }
    } else {
      const user = new User({ email, password, role: 'admin' });
      await user.save();
      console.log(`Admin account created for ${email}.`);
    }
  } finally {
    await disconnectFromDatabase();
  }
}

run().catch((err) => {
  console.error('seed-admin failed:', err);
  process.exitCode = 1;
});
