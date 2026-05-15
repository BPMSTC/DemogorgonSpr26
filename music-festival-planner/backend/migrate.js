/**
 * Migration script — imports localStorage-exported JSON into MongoDB.
 *
 * Usage (from the backend/ directory):
 *   npm run migrate -- --file path/to/export.json
 */

const fs = require('fs');
const path = require('path');
const {
  connectToDatabase,
  disconnectFromDatabase,
} = require('./config/database');
const Festival = require('./models/festival');
const Stage = require('./models/stage');
const Artist = require('./models/artist');
const Performance = require('./models/performance');

// Read the target JSON file path from CLI arguments, supporting both --file and positional forms.
function getFilePath() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--file');
  // Prefer the explicit --file flag if present.
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }

  // Fall back to the first non-flag argument as a convenience shorthand.
  const positional = args.find((arg) => !arg.startsWith('-'));
  return positional ? path.resolve(positional) : null;
}

// Convert a raw value into a Date, returning null if the value is missing or unparseable.
function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  // isNaN check guards against strings that produce an invalid Date object.
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// Build a full UTC Date from a separate date string and a time string (H:mm or HH:mm).
function parseDateAndTime(dateText, timeText) {
  // Reject anything that does not look like a YYYY-MM-DD date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText))) return null;
  // Extract hours and minutes from the time string.
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeText || '').trim());
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  // Ensure both values are integers before checking range.
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  // Guard against out-of-range values that would produce a nonsensical datetime.
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  // Build an ISO string and parse it into a Date, treating the time as UTC.
  const parsed = new Date(
    `${dateText}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`
  );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// Main migration function that reads the export file and upserts records into MongoDB.
async function migrate() {
  // Resolve and validate the file path before opening a database connection.
  const filePath = getFilePath();
  if (!filePath) {
    console.error('Usage: npm run migrate -- --file path/to/export.json');
    process.exit(1);
  }

  // Make sure the file actually exists before trying to read it.
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Parse the JSON file, surfacing any syntax errors immediately.
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  // Default to empty arrays so the rest of the script can iterate safely.
  const { festivals = [], stages = [], performances = [] } = data;
  console.log(
    `Loaded ${festivals.length} festival(s), ${stages.length} stage(s), ${performances.length} performance(s).`
  );

  // Open the database connection now that we know the input is valid.
  await connectToDatabase();

  // These maps translate old localStorage IDs to real MongoDB ObjectIds.
  const festivalIdMap = new Map();
  const stageIdByFestivalAndName = new Map();

  // Counters for the final summary printed at the end of the migration.
  let festivalsCreated = 0;
  let festivalsSkipped = 0;
  let stagesCreated = 0;
  let stagesSkipped = 0;
  let performancesCreated = 0;
  let performancesSkipped = 0;

  // ---- Festivals -----------------------------------------------------------
  for (const inputFestival of festivals) {
    // Parse dates early so we can validate the record before hitting the database.
    const startDate = parseDateOrNull(inputFestival.startDate);
    const endDate = parseDateOrNull(inputFestival.endDate);

    // Skip records that are missing any required field — they cannot be inserted.
    if (!inputFestival.name || !startDate || !endDate || !inputFestival.location) {
      continue;
    }

    // Check whether this festival already exists so we avoid creating duplicates.
    const existing = await Festival.findOne({
      name: inputFestival.name,
      startDate,
    });

    if (existing) {
      // Record the mapping even for skipped festivals so stages can still reference them.
      festivalIdMap.set(inputFestival.id, existing._id.toString());
      festivalsSkipped++;
      continue;
    }

    // Create the festival document and store its new ID in the map for downstream use.
    const created = await new Festival({
      name: inputFestival.name,
      startDate,
      endDate,
      location: inputFestival.location,
      genre: inputFestival.genre || '',
      capacity:
        typeof inputFestival.capacity === 'number' ? inputFestival.capacity : 0,
    }).save();

    festivalIdMap.set(inputFestival.id, created._id.toString());
    festivalsCreated++;
  }

  console.log(
    `Festivals — created: ${festivalsCreated}, skipped(existing): ${festivalsSkipped}`
  );

  // ---- Stages --------------------------------------------------------------
  for (const inputStage of stages) {
    // Look up the festival this stage belongs to using the ID mapping we built above.
    const mappedFestivalId = festivalIdMap.get(inputStage.festivalId);
    // Skip if the parent festival could not be resolved or the stage has no name.
    if (!mappedFestivalId || !inputStage.name) continue;

    // Use a case-insensitive search to avoid duplicating stages with different casing.
    const existing = await Stage.findOne({
      festival: mappedFestivalId,
      name: { $regex: new RegExp(`^${inputStage.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      // Store the existing stage's ID so performances can still link to it.
      const existingKey = `${mappedFestivalId}::${existing.name.toLowerCase()}`;
      stageIdByFestivalAndName.set(existingKey, existing._id.toString());
      stagesSkipped++;
      continue;
    }

    // Create the stage document with sensible defaults for any missing optional fields.
    const created = await new Stage({
      festival: mappedFestivalId,
      name: inputStage.name,
      capacity:
        Number.isInteger(inputStage.capacity) && inputStage.capacity > 0
          ? inputStage.capacity
          : 1000,
      environment: inputStage.environment || 'outdoor',
      status: inputStage.status || 'active',
      notes: inputStage.notes || '',
    }).save();

    // Use a lowercase composite key so lookups are case-insensitive by default.
    const key = `${mappedFestivalId}::${created.name.toLowerCase()}`;
    stageIdByFestivalAndName.set(key, created._id.toString());
    stagesCreated++;
  }

  console.log(`Stages — created: ${stagesCreated}, skipped(existing): ${stagesSkipped}`);

  // ---- Performances --------------------------------------------------------
  for (const inputPerformance of performances) {
    // Resolve the parent festival — skip if it was not migrated.
    const mappedFestivalId = festivalIdMap.get(inputPerformance.festivalId);
    if (!mappedFestivalId) continue;

    // Build the composite key to look up the stage this performance is on.
    const stageKey = `${mappedFestivalId}::${String(
      inputPerformance.stageName || ''
    ).toLowerCase()}`;

    // Try the in-memory cache first before falling back to a database query.
    let stageId = stageIdByFestivalAndName.get(stageKey);
    if (!stageId) {
      // Query the database in case the stage was created in a previous migration run.
      const stageDoc = await Stage.findOne({
        festival: mappedFestivalId,
        name: {
          $regex: new RegExp(
            `^${String(inputPerformance.stageName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          ),
        },
      });
      // Skip this performance if the stage cannot be found.
      if (!stageDoc) continue;
      stageId = stageDoc._id.toString();
      // Cache the result so future iterations do not need another database round-trip.
      stageIdByFestivalAndName.set(stageKey, stageId);
    }

    // An artist name is required to create or link the artist record.
    if (!inputPerformance.artistName) continue;

    // Try to find an existing artist by name using a case-insensitive search.
    let artist = await Artist.findOne({
      name: {
        $regex: new RegExp(
          `^${String(inputPerformance.artistName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      },
    });

    // Create a minimal artist record if none exists so the performance is not dropped.
    if (!artist) {
      artist = await new Artist({
        name: inputPerformance.artistName,
        genre: inputPerformance.genre || 'Unknown',
        description: '',
      }).save();
    }

    // Convert the separate date and time strings into proper Date objects.
    const startDateTime = parseDateAndTime(
      inputPerformance.date,
      inputPerformance.startTime
    );
    const endDateTime = parseDateAndTime(
      inputPerformance.date,
      inputPerformance.endTime
    );

    // Skip the record if the times are invalid or the end is not after the start.
    if (!startDateTime || !endDateTime || startDateTime >= endDateTime) continue;

    // Check for an exact duplicate before inserting to keep the migration idempotent.
    const existing = await Performance.findOne({
      festival: mappedFestivalId,
      stage: stageId,
      artist: artist._id,
      startDateTime,
    });

    if (existing) {
      performancesSkipped++;
      continue;
    }

    // Save the new performance document with all resolved references.
    await new Performance({
      festival: mappedFestivalId,
      stage: stageId,
      artist: artist._id,
      startDateTime,
      endDateTime,
      // Prefer the performance-level genre, then fall back to the artist's genre.
      genre: inputPerformance.genre || artist.genre || '',
    }).save();

    performancesCreated++;
  }

  console.log(
    `Performances — created: ${performancesCreated}, skipped(existing): ${performancesSkipped}`
  );

  console.log('\nMigration complete!');
  // Close the connection cleanly once all records have been processed.
  await disconnectFromDatabase();
}

// Start the migration and ensure the database connection is closed even if an error occurs.
migrate().catch(async (err) => {
  console.error('Migration failed:', err);
  await disconnectFromDatabase();
  process.exit(1);
});
