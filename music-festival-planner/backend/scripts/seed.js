const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const { Festival, Stage, Artist, Performance } = require('../models');

// CLI flags and environment variable names used to control reset behaviour.
const RESET_FLAG = '--reset';
const CONFIRM_FLAG = '--confirm';
const RESET_CONFIRM_TOKEN = 'WIPE';
const FORCE_RESET_ENV = 'SEED_FORCE_RESET';
const RESET_CONFIRM_ENV = 'SEED_RESET_CONFIRM';

// Seed strategy overview:
// 1) Insert top-level festivals first.
// 2) Insert stages and artists.
// 3) Insert performances that reference festival/stage/artist ObjectIds.
//
// This order guarantees references are valid and makes the script repeatable.

// Two festivals across different dates/locations for realistic browsing.
const FESTIVAL_SEED = [
  {
    name: 'North Coast Pulse 2026',
    location: 'Chicago, IL',
    startDate: new Date('2026-07-18T00:00:00.000Z'),
    endDate: new Date('2026-07-20T23:59:59.000Z'),
    description: 'Three days of electronic, indie, and dance acts by the lake.',
    imageUrl:
      'https://assets.simpleviewinc.com/simpleview/image/upload/c_fill,f_jpg,h_512,q_65,w_1440/v1/clients/ftlauderdale/Tortuga_Sky_Shot_bea0bd81-94dc-4814-b513-9612e13fc417.jpg',
  },
  {
    name: 'Sunset Echo Weekend 2026',
    location: 'Austin, TX',
    startDate: new Date('2026-09-04T00:00:00.000Z'),
    endDate: new Date('2026-09-06T23:59:59.000Z'),
    description: 'A city-wide weekend festival focused on alt-pop and neo-soul.',
    imageUrl:
      'https://i0.wp.com/discotech.me/wp-content/uploads/2023/02/sunset-music-festival-tampa-florida.jpg?resize=845%2C321&ssl=1',
  },
];

// Build a quick lookup of each festival's date range so we can verify shifted performances fit inside the window.
const FESTIVAL_WINDOW_BY_NAME = new Map(
  FESTIVAL_SEED.map((festival) => [
    festival.name,
    { startDate: festival.startDate, endDate: festival.endDate },
  ]),
);

// Stages are grouped by festival name to make mapping easier during insert.
const STAGE_SEED = {
  'North Coast Pulse 2026': [
    { name: 'Main Horizon', environment: 'outdoor', capacity: 18000 },
    { name: 'River Tent', environment: 'tent', capacity: 7500 },
    { name: 'Warehouse Club', environment: 'club', capacity: 3200 },
    { name: 'Sunset Garden', environment: 'outdoor', capacity: 9800 },
  ],
  'Sunset Echo Weekend 2026': [
    { name: 'City Lights Main', environment: 'outdoor', capacity: 16000 },
    { name: 'Oak Hall', environment: 'indoor', capacity: 5200 },
    { name: 'Midnight Dome', environment: 'tent', capacity: 6800 },
    { name: 'Rooftop Sessions', environment: 'club', capacity: 2400 },
  ],
};

// Shared artist pool; artists can perform at multiple festivals.
const ARTIST_SEED = [
  {
    name: 'Neon Atlas',
    genre: 'Electronic',
    description: 'Melodic house duo with cinematic live visuals.',
    imageUrl: 'https://placehold.co/600x600?text=Neon+Atlas',
    country: 'US',
  },
  {
    name: 'Solar Echoes',
    genre: 'Indie Pop',
    description: 'Dreamy hooks and layered harmonies from the Pacific Northwest.',
    imageUrl: 'https://placehold.co/600x600?text=Solar+Echoes',
    country: 'US',
  },
  {
    name: 'The Midnight Static',
    genre: 'Alt Rock',
    description: 'Gritty alt-rock quartet known for high-energy sets.',
    imageUrl: 'https://placehold.co/600x600?text=The+Midnight+Static',
    country: 'UK',
  },
  {
    name: 'Velvet Comet',
    genre: 'Synthwave',
    description: 'Retro-futuristic synth lines and neon-soaked beats.',
    imageUrl: 'https://placehold.co/600x600?text=Velvet+Comet',
    country: 'CA',
  },
  {
    name: 'Juniper Bay',
    genre: 'Folk',
    description: 'Acoustic storytelling trio with warm vocal textures.',
    imageUrl: 'https://placehold.co/600x600?text=Juniper+Bay',
    country: 'US',
  },
  {
    name: 'Kilo North',
    genre: 'Hip-Hop',
    description: 'Lyrical rapper blending classic boom-bap with modern production.',
    imageUrl: 'https://placehold.co/600x600?text=Kilo+North',
    country: 'US',
  },
  {
    name: 'Aurora District',
    genre: 'Progressive House',
    description: 'Festival-ready progressive sets with euphoric drops.',
    imageUrl: 'https://placehold.co/600x600?text=Aurora+District',
    country: 'DE',
  },
  {
    name: 'Saffron Tide',
    genre: 'Neo Soul',
    description: 'Soulful grooves, jazz-influenced chords, and rich vocals.',
    imageUrl: 'https://placehold.co/600x600?text=Saffron+Tide',
    country: 'UK',
  },
  {
    name: 'Paper Satellites',
    genre: 'Indie Rock',
    description: 'Hook-driven indie rock with layered guitar effects.',
    imageUrl: 'https://placehold.co/600x600?text=Paper+Satellites',
    country: 'US',
  },
  {
    name: 'Night Relay',
    genre: 'Drum and Bass',
    description: 'Fast, technical drum-and-bass sets built for late-night crowds.',
    imageUrl: 'https://placehold.co/600x600?text=Night+Relay',
    country: 'NL',
  },
  {
    name: 'Luma Vale',
    genre: 'Electropop',
    description: 'Vibrant electropop project with theatrical performances.',
    imageUrl: 'https://placehold.co/600x600?text=Luma+Vale',
    country: 'SE',
  },
  {
    name: 'Granite Hearts',
    genre: 'Alternative',
    description: 'Dark, atmospheric alt anthems with dynamic stage presence.',
    imageUrl: 'https://placehold.co/600x600?text=Granite+Hearts',
    country: 'IE',
  },
  {
    name: 'Ember Current',
    genre: 'R&B',
    description: 'Smooth R&B vocals over minimalist electronic production.',
    imageUrl: 'https://placehold.co/600x600?text=Ember+Current',
    country: 'US',
  },
  {
    name: 'Tidal Syntax',
    genre: 'Techno',
    description: 'Minimal techno grooves and deep rolling basslines.',
    imageUrl: 'https://placehold.co/600x600?text=Tidal+Syntax',
    country: 'DE',
  },
  {
    name: 'Cedar & Code',
    genre: 'Singer-Songwriter',
    description: 'Intimate acoustic performances with lyrical storytelling.',
    imageUrl: 'https://placehold.co/600x600?text=Cedar+and+Code',
    country: 'CA',
  },
  {
    name: 'Orbit Bloom',
    genre: 'Dance Pop',
    description: 'Upbeat dance-pop with choreography-friendly live sets.',
    imageUrl: 'https://placehold.co/600x600?text=Orbit+Bloom',
    country: 'US',
  },
];

// Performance rows are authored with readable names (festival/stage/artist).
// During insertion we translate these names into ObjectId references.
const BASE_PERFORMANCE_SEED = [
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Main Horizon',
    artistName: 'Neon Atlas',
    start: '2026-07-18T18:00:00.000Z',
    end: '2026-07-18T19:00:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'River Tent',
    artistName: 'Solar Echoes',
    start: '2026-07-18T18:20:00.000Z',
    end: '2026-07-18T19:05:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Warehouse Club',
    artistName: 'The Midnight Static',
    start: '2026-07-18T19:15:00.000Z',
    end: '2026-07-18T20:00:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Sunset Garden',
    artistName: 'Velvet Comet',
    start: '2026-07-18T19:30:00.000Z',
    end: '2026-07-18T20:15:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Main Horizon',
    artistName: 'Kilo North',
    start: '2026-07-18T20:30:00.000Z',
    end: '2026-07-18T21:20:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'River Tent',
    artistName: 'Juniper Bay',
    start: '2026-07-18T20:40:00.000Z',
    end: '2026-07-18T21:25:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Warehouse Club',
    artistName: 'Night Relay',
    start: '2026-07-18T21:30:00.000Z',
    end: '2026-07-18T22:20:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Sunset Garden',
    artistName: 'Aurora District',
    start: '2026-07-18T21:35:00.000Z',
    end: '2026-07-18T22:30:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Main Horizon',
    artistName: 'Luma Vale',
    start: '2026-07-19T18:10:00.000Z',
    end: '2026-07-19T19:00:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'River Tent',
    artistName: 'Granite Hearts',
    start: '2026-07-19T18:25:00.000Z',
    end: '2026-07-19T19:10:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Warehouse Club',
    artistName: 'Tidal Syntax',
    start: '2026-07-19T19:20:00.000Z',
    end: '2026-07-19T20:10:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Sunset Garden',
    artistName: 'Saffron Tide',
    start: '2026-07-19T19:25:00.000Z',
    end: '2026-07-19T20:10:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Main Horizon',
    artistName: 'Orbit Bloom',
    start: '2026-07-19T20:30:00.000Z',
    end: '2026-07-19T21:20:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'River Tent',
    artistName: 'Cedar & Code',
    start: '2026-07-19T20:35:00.000Z',
    end: '2026-07-19T21:15:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Warehouse Club',
    artistName: 'Paper Satellites',
    start: '2026-07-19T21:25:00.000Z',
    end: '2026-07-19T22:10:00.000Z',
  },
  {
    festivalName: 'North Coast Pulse 2026',
    stageName: 'Sunset Garden',
    artistName: 'Ember Current',
    start: '2026-07-19T21:40:00.000Z',
    end: '2026-07-19T22:25:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'City Lights Main',
    artistName: 'Saffron Tide',
    start: '2026-09-04T18:00:00.000Z',
    end: '2026-09-04T18:50:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Oak Hall',
    artistName: 'Juniper Bay',
    start: '2026-09-04T18:10:00.000Z',
    end: '2026-09-04T18:55:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Midnight Dome',
    artistName: 'Neon Atlas',
    start: '2026-09-04T19:05:00.000Z',
    end: '2026-09-04T19:55:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Rooftop Sessions',
    artistName: 'Cedar & Code',
    start: '2026-09-04T19:20:00.000Z',
    end: '2026-09-04T20:00:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'City Lights Main',
    artistName: 'Orbit Bloom',
    start: '2026-09-04T20:10:00.000Z',
    end: '2026-09-04T21:00:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Oak Hall',
    artistName: 'Solar Echoes',
    start: '2026-09-04T20:20:00.000Z',
    end: '2026-09-04T21:05:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Midnight Dome',
    artistName: 'Tidal Syntax',
    start: '2026-09-04T21:10:00.000Z',
    end: '2026-09-04T22:05:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Rooftop Sessions',
    artistName: 'Ember Current',
    start: '2026-09-04T21:25:00.000Z',
    end: '2026-09-04T22:10:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'City Lights Main',
    artistName: 'The Midnight Static',
    start: '2026-09-05T18:05:00.000Z',
    end: '2026-09-05T18:55:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Oak Hall',
    artistName: 'Granite Hearts',
    start: '2026-09-05T18:20:00.000Z',
    end: '2026-09-05T19:10:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Midnight Dome',
    artistName: 'Night Relay',
    start: '2026-09-05T19:15:00.000Z',
    end: '2026-09-05T20:00:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Rooftop Sessions',
    artistName: 'Paper Satellites',
    start: '2026-09-05T19:30:00.000Z',
    end: '2026-09-05T20:15:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'City Lights Main',
    artistName: 'Aurora District',
    start: '2026-09-05T20:20:00.000Z',
    end: '2026-09-05T21:15:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Oak Hall',
    artistName: 'Luma Vale',
    start: '2026-09-05T20:25:00.000Z',
    end: '2026-09-05T21:15:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Midnight Dome',
    artistName: 'Velvet Comet',
    start: '2026-09-05T21:25:00.000Z',
    end: '2026-09-05T22:15:00.000Z',
  },
  {
    festivalName: 'Sunset Echo Weekend 2026',
    stageName: 'Rooftop Sessions',
    artistName: 'Kilo North',
    start: '2026-09-05T21:35:00.000Z',
    end: '2026-09-05T22:20:00.000Z',
  },
];

/**
 * @typedef {Object} PerformanceSeedEntry
 * @property {string} festivalName
 * @property {string} stageName
 * @property {string} artistName
 * @property {string} start
 * @property {string} end
 */

// Move a datetime forward by a whole number of days so the same slot can appear on different festival days.
/** @param {string} isoDateTime @param {number} daysToAdd */
function shiftIsoDateTimeByDays(isoDateTime, daysToAdd) {
  const shifted = new Date(isoDateTime);
  shifted.setUTCDate(shifted.getUTCDate() + daysToAdd);
  return shifted.toISOString();
}

// Check that a shifted performance slot still falls inside the festival's scheduled dates.
/**
 * @param {string} festivalName
 * @param {string} shiftedStartIso
 * @param {string} shiftedEndIso
 */
function isWithinFestivalWindow(festivalName, shiftedStartIso, shiftedEndIso) {
  const window = FESTIVAL_WINDOW_BY_NAME.get(festivalName);
  // If the festival is not in our lookup we cannot validate, so treat as out-of-window.
  if (!window) return false;

  const shiftedStart = new Date(shiftedStartIso);
  const shiftedEnd = new Date(shiftedEndIso);

  // Both the start and end must fall inside the festival's declared date range.
  return shiftedStart >= window.startDate && shiftedEnd <= window.endDate;
}

// Expand each base performance entry across multiple days to fill the whole festival schedule.
/** @param {PerformanceSeedEntry[]} baseSeed */
function buildExpandedPerformanceSeed(baseSeed) {
  // Try shifting each entry by 0, 1, and 2 days to cover a 3-day festival.
  const dayShifts = [0, 1, 2];
  /** @type {PerformanceSeedEntry[]} */
  const expanded = [];

  baseSeed.forEach((entry) => {
    dayShifts.forEach((dayShift) => {
      // Calculate what the start and end would be on this shifted day.
      const shiftedStart = shiftIsoDateTimeByDays(entry.start, dayShift);
      const shiftedEnd = shiftIsoDateTimeByDays(entry.end, dayShift);

      // Skip this shifted slot if it would fall outside the festival window.
      if (!isWithinFestivalWindow(entry.festivalName, shiftedStart, shiftedEnd)) {
        return;
      }

      // Add the shifted copy to the output list with updated timestamps.
      expanded.push({
        ...entry,
        start: shiftedStart,
        end: shiftedEnd,
      });
    });
  });

  return expanded;
}

// Build the full performance list by expanding the base seed across all festival days.
const EXPANDED_PERFORMANCE_SEED = buildExpandedPerformanceSeed(BASE_PERFORMANCE_SEED);

// Repeatable seeding means clearing old docs before inserting fresh data.
// Delete order starts from child collections to avoid future FK-like constraints.
async function resetCollections() {
  await Promise.all([
    Performance.deleteMany({}),
    Stage.deleteMany({}),
    Artist.deleteMany({}),
    Festival.deleteMany({}),
  ]);
}

// Insert festivals and return a lookup map:
//   festival name -> festival ObjectId
// This map is later used to connect stages/performances.
async function seedFestivals() {
  const festivals = await Festival.insertMany(FESTIVAL_SEED, { ordered: true });
  // Map each festival's name to its newly assigned database ID for downstream lookups.
  return new Map(festivals.map((festival) => [festival.name, festival._id]));
}

// Insert stage docs by resolving each festival name to its ObjectId.
// Returns map:
//   "<festivalId>::<stageName>" -> stage ObjectId
/** @param {Map<string, any>} festivalIdByName */
async function seedStages(festivalIdByName) {
  /** @type {Array<Record<string, any>>} */
  const stageDocuments = [];

  Object.entries(STAGE_SEED).forEach(([festivalName, stages]) => {
    // Look up parent festival id once per stage group.
    const festivalId = festivalIdByName.get(festivalName);

    stages.forEach((stage) => {
      // Expand into one flat document array for bulk insert.
      stageDocuments.push({
        festival: festivalId,
        ...stage,
      });
    });
  });

  const createdStages = await Stage.insertMany(stageDocuments, { ordered: true });

  return new Map(
    createdStages.map((stage) => {
      // Composite key avoids collisions where multiple festivals might
      // use the same stage name like "Main Stage".
      const key = `${stage.festival.toString()}::${stage.name}`;
      return [key, stage._id];
    }),
  );
}

// Insert artists and return map:
//   artist name -> artist ObjectId
async function seedArtists() {
  const artists = await Artist.insertMany(ARTIST_SEED, { ordered: true });
  // Map each artist's name to their new database ID for performance linking.
  return new Map(artists.map((artist) => [artist.name, artist._id]));
}

// Convert human-readable performance rows into normalized DB documents.
// Each row becomes a document with ObjectId references + Date values.
/**
 * @param {Map<string, any>} festivalIdByName
 * @param {Map<string, any>} stageIdByFestivalAndName
 * @param {Map<string, any>} artistIdByName
 */
async function seedPerformances(festivalIdByName, stageIdByFestivalAndName, artistIdByName) {
  const performanceDocuments = EXPANDED_PERFORMANCE_SEED.map((entry) => {
    // Resolve each human-readable name to its database ObjectId.
    const festivalId = festivalIdByName.get(entry.festivalName);
    const stageId = stageIdByFestivalAndName.get(`${festivalId.toString()}::${entry.stageName}`);
    const artistId = artistIdByName.get(entry.artistName);

    // Fail fast if any mapping is missing so broken seed data is obvious.
    if (!festivalId || !stageId || !artistId) {
      throw new Error(`Could not map IDs for performance seed entry: ${JSON.stringify(entry)}`);
    }

    // Build the final document shape expected by the Performance model.
    return {
      festival: festivalId,
      stage: stageId,
      artist: artistId,
      startDateTime: new Date(entry.start),
      endDateTime: new Date(entry.end),
    };
  });

  await Performance.insertMany(performanceDocuments, { ordered: true });
}

// Helpful terminal output after seed to verify result shape quickly.
async function printSummary() {
  const [festivalCount, stageCount, artistCount, performanceCount] = await Promise.all([
    Festival.countDocuments(),
    Stage.countDocuments(),
    Artist.countDocuments(),
    Performance.countDocuments(),
  ]);
  // Sum up all inserted documents to check we meet the minimum target.
  const totalDocuments = festivalCount + stageCount + artistCount + performanceCount;

  console.log('Seed completed successfully.');
  console.table({
    festivals: festivalCount,
    stages: stageCount,
    artists: artistCount,
    performances: performanceCount,
    totalDocuments,
    meetsHundredDocTarget: totalDocuments >= 100,
  });
}

// Fetch current document counts from all seed-managed collections.
async function getCollectionCounts() {
  const [festivalCount, stageCount, artistCount, performanceCount] = await Promise.all([
    Festival.countDocuments(),
    Stage.countDocuments(),
    Artist.countDocuments(),
    Performance.countDocuments(),
  ]);

  return {
    festivals: festivalCount,
    stages: stageCount,
    artists: artistCount,
    performances: performanceCount,
  };
}

// Determine whether the user has requested a destructive reset via CLI flag or env variable.
function shouldResetData() {
  const hasResetFlag = process.argv.includes(RESET_FLAG);
  const forceResetFromEnv = process.env[FORCE_RESET_ENV] === 'true';
  return hasResetFlag || forceResetFromEnv;
}

// Pull the confirmation token value that was passed after the --confirm flag.
function getCliConfirmValue() {
  const confirmFlagIndex = process.argv.indexOf(CONFIRM_FLAG);
  // Return empty string when the flag was not provided at all.
  if (confirmFlagIndex === -1) {
    return '';
  }
  return process.argv[confirmFlagIndex + 1] || '';
}

// Check whether the user has supplied the required confirmation token via CLI or environment.
function hasValidResetConfirmation() {
  const cliConfirm = getCliConfirmValue();
  const envConfirm = process.env[RESET_CONFIRM_ENV] || '';
  // Accept the token from either source so both interactive and CI workflows are supported.
  return cliConfirm === RESET_CONFIRM_TOKEN || envConfirm === RESET_CONFIRM_TOKEN;
}

/**
 * Prevent accidental destructive reseeds unless an explicit reset mode is enabled.
 * @param {boolean} canReset
 */
async function ensureSafeSeedMode(canReset) {
  const counts = await getCollectionCounts();
  // Any non-zero count means data already exists that could be overwritten.
  const hasExistingData = Object.values(counts).some((count) => count > 0);

  // Allow the seed to proceed when there is no existing data or the user opted into a reset.
  if (!hasExistingData || canReset) {
    return { counts, hasExistingData };
  }

  // Block the seed and print guidance so the user knows how to opt in intentionally.
  console.error('Seed aborted to protect existing data.');
  console.table(counts);
  console.error(
    `Use \`npm run seed:reset\` or pass ${RESET_FLAG} to perform a destructive reseed intentionally.`,
  );
  console.error(`You can also set ${FORCE_RESET_ENV}=true for CI-style non-interactive resets.`);
  process.exitCode = 1;
  return null;
}

/**
 * Require explicit human confirmation before destructive reset mode can run.
 * @param {boolean} canReset
 */
function ensureResetConfirmed(canReset) {
  // Nothing to confirm when reset mode was not requested.
  if (!canReset) {
    return true;
  }

  // Allow the reset to proceed when the correct confirmation token is present.
  if (hasValidResetConfirmation()) {
    return true;
  }

  // Print instructions so the user knows exactly what they need to add.
  console.error('Seed reset aborted: confirmation token missing.');
  console.error(
    `When using ${RESET_FLAG}, also pass ${CONFIRM_FLAG} ${RESET_CONFIRM_TOKEN} to confirm destructive reset.`,
  );
  console.error(
    `Alternative: set ${FORCE_RESET_ENV}=true and ${RESET_CONFIRM_ENV}=${RESET_CONFIRM_TOKEN}.`,
  );
  process.exitCode = 1;
  return false;
}

// Main script orchestration.
async function runSeed() {
  try {
    // Open DB connection once for the full seed transaction-like flow.
    await connectToDatabase();

    // Check whether a destructive reset was requested and confirmed before doing anything else.
    const allowReset = shouldResetData();
    if (!ensureResetConfirmed(allowReset)) {
      return;
    }

    // Verify it is safe to proceed given the current state of the database.
    const safetyCheck = await ensureSafeSeedMode(allowReset);
    if (!safetyCheck) {
      return;
    }

    // Start from a known clean state only when explicitly requested.
    if (allowReset) {
      await resetCollections();
    }

    // Insert in dependency order so references are always valid.
    const festivalIdByName = await seedFestivals();
    const stageIdByFestivalAndName = await seedStages(festivalIdByName);
    const artistIdByName = await seedArtists();

    // Performances come last because they reference all three collections above.
    await seedPerformances(festivalIdByName, stageIdByFestivalAndName, artistIdByName);

    await printSummary();
  } catch (error) {
    // Keep stack for debugging mapping/validation issues.
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    // Always disconnect for one-off scripts.
    await disconnectFromDatabase();
  }
}

// Run immediately when called by `npm run seed`.
runSeed();
