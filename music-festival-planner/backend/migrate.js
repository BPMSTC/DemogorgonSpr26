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

function getFilePath() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--file');
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }

  const positional = args.find((arg) => !arg.startsWith('-'));
  return positional ? path.resolve(positional) : null;
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseDateAndTime(dateText, timeText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText))) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeText || '').trim());
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  const parsed = new Date(
    `${dateText}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`
  );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

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
  console.log(
    `Loaded ${festivals.length} festival(s), ${stages.length} stage(s), ${performances.length} performance(s).`
  );

  await connectToDatabase();

  const festivalIdMap = new Map();
  const stageIdByFestivalAndName = new Map();

  let festivalsCreated = 0;
  let festivalsSkipped = 0;
  let stagesCreated = 0;
  let stagesSkipped = 0;
  let performancesCreated = 0;
  let performancesSkipped = 0;

  // ---- Festivals -----------------------------------------------------------
  for (const inputFestival of festivals) {
    const startDate = parseDateOrNull(inputFestival.startDate);
    const endDate = parseDateOrNull(inputFestival.endDate);

    if (!inputFestival.name || !startDate || !endDate || !inputFestival.location) {
      continue;
    }

    const existing = await Festival.findOne({
      name: inputFestival.name,
      startDate,
    });

    if (existing) {
      festivalIdMap.set(inputFestival.id, existing._id.toString());
      festivalsSkipped++;
      continue;
    }

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
    const mappedFestivalId = festivalIdMap.get(inputStage.festivalId);
    if (!mappedFestivalId || !inputStage.name) continue;

    const existing = await Stage.findOne({
      festival: mappedFestivalId,
      name: { $regex: new RegExp(`^${inputStage.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      const existingKey = `${mappedFestivalId}::${existing.name.toLowerCase()}`;
      stageIdByFestivalAndName.set(existingKey, existing._id.toString());
      stagesSkipped++;
      continue;
    }

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

    const key = `${mappedFestivalId}::${created.name.toLowerCase()}`;
    stageIdByFestivalAndName.set(key, created._id.toString());
    stagesCreated++;
  }

  console.log(`Stages — created: ${stagesCreated}, skipped(existing): ${stagesSkipped}`);

  // ---- Performances --------------------------------------------------------
  for (const inputPerformance of performances) {
    const mappedFestivalId = festivalIdMap.get(inputPerformance.festivalId);
    if (!mappedFestivalId) continue;

    const stageKey = `${mappedFestivalId}::${String(
      inputPerformance.stageName || ''
    ).toLowerCase()}`;

    let stageId = stageIdByFestivalAndName.get(stageKey);
    if (!stageId) {
      const stageDoc = await Stage.findOne({
        festival: mappedFestivalId,
        name: {
          $regex: new RegExp(
            `^${String(inputPerformance.stageName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          ),
        },
      });
      if (!stageDoc) continue;
      stageId = stageDoc._id.toString();
      stageIdByFestivalAndName.set(stageKey, stageId);
    }

    if (!inputPerformance.artistName) continue;

    let artist = await Artist.findOne({
      name: {
        $regex: new RegExp(
          `^${String(inputPerformance.artistName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      },
    });

    if (!artist) {
      artist = await new Artist({
        name: inputPerformance.artistName,
        genre: inputPerformance.genre || 'Unknown',
        description: '',
      }).save();
    }

    const startDateTime = parseDateAndTime(
      inputPerformance.date,
      inputPerformance.startTime
    );
    const endDateTime = parseDateAndTime(
      inputPerformance.date,
      inputPerformance.endTime
    );

    if (!startDateTime || !endDateTime || startDateTime >= endDateTime) continue;

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

    await new Performance({
      festival: mappedFestivalId,
      stage: stageId,
      artist: artist._id,
      startDateTime,
      endDateTime,
      genre: inputPerformance.genre || artist.genre || '',
    }).save();

    performancesCreated++;
  }

  console.log(
    `Performances — created: ${performancesCreated}, skipped(existing): ${performancesSkipped}`
  );

  console.log('\nMigration complete!');
  await disconnectFromDatabase();
}

migrate().catch(async (err) => {
  console.error('Migration failed:', err);
  await disconnectFromDatabase();
  process.exit(1);
});
