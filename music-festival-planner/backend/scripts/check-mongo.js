const { connectToDatabase, disconnectFromDatabase, getMongoUri } = require('../config/database');
const { Festival, Stage, Artist, Performance } = require('../models');

// Quick diagnostics script to validate that:
// 1) MongoDB is reachable
// 2) Auth/connection string is valid
// 3) Expected collections are queryable
async function checkMongoConnection() {
  try {
    // Open connection using shared helper and env settings.
    const connection = await connectToDatabase();

    // Server ping confirms the DB responds to commands.
    await connection.db.admin().ping();

    // Count docs in each collection to verify model wiring and seed results.
    const [festivalCount, stageCount, artistCount, performanceCount] = await Promise.all([
      Festival.countDocuments(),
      Stage.countDocuments(),
      Artist.countDocuments(),
      Performance.countDocuments(),
    ]);

    console.log('MongoDB connection check passed.');
    // `connection.name` is the database name Mongoose connected to.
    console.log(`Database: ${connection.name}`);
    // Printing URI is helpful for beginners while debugging environment values.
    console.log(`URI: ${getMongoUri()}`);
    console.table({
      festivals: festivalCount,
      stages: stageCount,
      artists: artistCount,
      performances: performanceCount,
    });
  } catch (error) {
    // Keep output concise and actionable in terminal.
    console.error('MongoDB connection check failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Always close connections in one-off scripts.
    await disconnectFromDatabase();
  }
}

// Run immediately when invoked via npm script.
checkMongoConnection();
