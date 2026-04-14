/**
 * Migration script — imports localStorage-exported JSON into MongoDB.
 *
 * Usage (from the backend/ directory):
 *   npm run migrate -- --file path/to/export.json
 *
 * Expected JSON format (export from the Angular app's localStorage):
 * {
 *   "festivals":    [{ "id": "...", "name": "...", "startDate": "...", ... }],
 *   "stages":       [{ "id": "...", "festivalId": "...", "name": "...", ... }],
 *   "performances": [{ "id": "...", "festivalId": "...", "artistName": "...", ... }]
 * }
 *
 * The script maps the old string IDs (UUIDs or any strings) to new MongoDB
 * ObjectIds so all cross-references (stage.festivalId, performance.festivalId)
 * remain consistent.
 *
 * Records that already exist in MongoDB are skipped (idempotent by name+date
 * for festivals, name+festivalId for stages, and all key fields for performances).
 */

require('dotenv').config();
const fs         = require('fs');
const path       = require('path');
const mongoose   = require('mongoose');
const connectDB  = require('./db');
const Festival   = require('./models/Festival');
const Stage      = require('./models/Stage');
const Performance = require('./models/Performance');

// ---- Argument parsing -------------------------------------------------------

function getFilePath() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--file');
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }
  // Positional fallback: first non-flag arg
  const positional = args.find((a) => !a.startsWith('-'));
  if (positional) return path.resolve(positional);
  return null;
}

// ---- Main -------------------------------------------------------------------

async function migrate() {
  const filePath = getFilePath();
  if (!filePath) {
    console.error('Usage: npm run migrate -- --file path/to/export.json');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  const { festivals = [], stages = [], performances = [] } = data;
  console.log(`Loaded ${festivals.length} festival(s), ${stages.length} stage(s), ${performances.length} performance(s) from file.`);

  await connectDB();

  // Map old string ID → new MongoDB ObjectId string
  const festivalIdMap = new Map(); // oldId → newId
  let festCreated = 0, festSkipped = 0;

  // ---- Festivals -------------------------------------------------------------
  for (const f of festivals) {
    const { id: oldId, name, startDate, endDate, location, genre, capacity } = f;

    // Idempotency check: skip if a festival with the same name+startDate exists.
    const existing = await Festival.findOne({ name, startDate });
    if (existing) {
      festivalIdMap.set(oldId, existing._id.toString());
      festSkipped++;
      continue;
    }

    const created = await new Festival({ name, startDate, endDate, location, genre, capacity }).save();
    festivalIdMap.set(oldId, created._id.toString());
    festCreated++;
  }
  console.log(`Festivals — created: ${festCreated}, skipped (already exist): ${festSkipped}`);

  // ---- Stages ---------------------------------------------------------------
  let stageCreated = 0, stageSkipped = 0;

  for (const s of stages) {
    const { festivalId: oldFestivalId, name, capacity, environment, status, notes } = s;
    const newFestivalId = festivalIdMap.get(oldFestivalId);

    if (!newFestivalId) {
      console.warn(`  Skipping stage "${name}": no matching festival for oldId ${oldFestivalId}`);
      continue;
    }

    // Idempotency check: skip if a stage with the same name exists in this festival.
    const existing = await Stage.findOne({
      festivalId: newFestivalId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existing) {
      stageSkipped++;
      continue;
    }

    await new Stage({ festivalId: newFestivalId, name, capacity, environment, status, notes }).save();
    stageCreated++;
  }
  console.log(`Stages — created: ${stageCreated}, skipped (already exist): ${stageSkipped}`);

  // ---- Performances ---------------------------------------------------------
  let perfCreated = 0, perfSkipped = 0;

  for (const p of performances) {
    const { festivalId: oldFestivalId, artistName, stageName, date, startTime, endTime, genre } = p;
    const newFestivalId = festivalIdMap.get(oldFestivalId);

    if (!newFestivalId) {
      console.warn(`  Skipping performance "${artistName}": no matching festival for oldId ${oldFestivalId}`);
      continue;
    }

    // Idempotency check: same artist + stage + date + startTime.
    const existing = await Performance.findOne({
      festivalId: newFestivalId,
      artistName,
      stageName,
      date,
      startTime,
    });
    if (existing) {
      perfSkipped++;
      continue;
    }

    await new Performance({ festivalId: newFestivalId, artistName, stageName, date, startTime, endTime, genre }).save();
    perfCreated++;
  }
  console.log(`Performances — created: ${perfCreated}, skipped (already exist): ${perfSkipped}`);

  console.log('\nMigration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
