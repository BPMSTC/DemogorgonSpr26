const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const { Festival, Stage, Artist, Performance } = require('../models');

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
    imageUrl: 'https://placehold.co/1200x600?text=North+Coast+Pulse',
  },
  {
    name: 'Sunset Echo Weekend 2026',
    location: 'Austin, TX',
    startDate: new Date('2026-09-04T00:00:00.000Z'),
    endDate: new Date('2026-09-06T23:59:59.000Z'),
    description: 'A city-wide weekend festival focused on alt-pop and neo-soul.',
    imageUrl: 'https://placehold.co/1200x600?text=Sunset+Echo+Weekend',
  },
];

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
const PERFORMANCE_SEED = [
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
  return new Map(festivals.map((festival) => [festival.name, festival._id]));
}

// Insert stage docs by resolving each festival name to its ObjectId.
// Returns map:
//   "<festivalId>::<stageName>" -> stage ObjectId
async function seedStages(festivalIdByName) {
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
    })
  );
}

// Insert artists and return map:
//   artist name -> artist ObjectId
async function seedArtists() {
  const artists = await Artist.insertMany(ARTIST_SEED, { ordered: true });
  return new Map(artists.map((artist) => [artist.name, artist._id]));
}

// Convert human-readable performance rows into normalized DB documents.
// Each row becomes a document with ObjectId references + Date values.
async function seedPerformances(festivalIdByName, stageIdByFestivalAndName, artistIdByName) {
  const performanceDocuments = PERFORMANCE_SEED.map((entry) => {
    const festivalId = festivalIdByName.get(entry.festivalName);
    const stageId = stageIdByFestivalAndName.get(`${festivalId.toString()}::${entry.stageName}`);
    const artistId = artistIdByName.get(entry.artistName);

    // Fail fast if any mapping is missing so broken seed data is obvious.
    if (!festivalId || !stageId || !artistId) {
      throw new Error(`Could not map IDs for performance seed entry: ${JSON.stringify(entry)}`);
    }

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

  console.log('Seed completed successfully.');
  console.table({
    festivals: festivalCount,
    stages: stageCount,
    artists: artistCount,
    performances: performanceCount,
  });
}

// Main script orchestration.
async function runSeed() {
  try {
    // Open DB connection once for the full seed transaction-like flow.
    await connectToDatabase();

    // Start from a known clean state.
    await resetCollections();

    // Insert in dependency order.
    const festivalIdByName = await seedFestivals();
    const stageIdByFestivalAndName = await seedStages(festivalIdByName);
    const artistIdByName = await seedArtists();

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
