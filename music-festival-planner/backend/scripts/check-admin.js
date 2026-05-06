const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const User = require('../models/user');

const { getMongoUri } = require('../config/database');

async function run() {
  const uri = getMongoUri();
  console.log('Connecting to:', uri.slice(0, 40) + '...');
  await connectToDatabase();

  const email = process.env.ADMIN_EMAIL || 'your@email.com';

  // Must explicitly select password since it has select:false on the schema
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    console.log(`No user found for email: ${email}`);
    await disconnectFromDatabase();
    return;
  }

  console.log(`Found user: ${user.email}, role: ${user.role}`);
  console.log(`Password hash stored: ${user.password}`);

  const testPassword = process.env.ADMIN_PASSWORD;
  if (testPassword) {
    const match = await user.comparePassword(testPassword);
    console.log(`Password "${testPassword}" matches: ${match}`);
  }

  await disconnectFromDatabase();
}

run().catch((err) => {
  console.error('check-admin failed:', err.message);
  process.exitCode = 1;
});
