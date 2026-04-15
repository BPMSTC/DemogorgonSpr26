/**
 * Seed script — populates the database with sample festival data.
 *
 * Usage (from the backend/ directory):
 *   npm run seed
 *
 * WARNING: This script wipes ALL existing festivals, stages, and performances
 * before inserting seed data.  Do not run against a production database.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Festival = require('./models/Festival');
const Stage = require('./models/Stage');
const Performance = require('./models/Performance');

// ---- Static seed data -------------------------------------------------------

const FESTIVAL_DEFS = [
  {
    name: 'Summer Solstice Festival',
    startDate: '2025-06-20',
    endDate: '2025-06-22',
    location: 'Austin, TX',
    genre: 'Rock',
    capacity: 25000,
  },
  {
    name: 'Desert Bloom Fest',
    startDate: '2025-07-04',
    endDate: '2025-07-06',
    location: 'Phoenix, AZ',
    genre: 'Electronic',
    capacity: 18000,
  },
  {
    name: 'Electric Horizons',
    startDate: '2025-08-01',
    endDate: '2025-08-03',
    location: 'Los Angeles, CA',
    genre: 'Electronic',
    capacity: 30000,
  },
  {
    name: 'Mountain Echo Fest',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
    location: 'Denver, CO',
    genre: 'Folk',
    capacity: 12000,
  },
  {
    name: 'Coastal Wave Festival',
    startDate: '2025-10-03',
    endDate: '2025-10-05',
    location: 'Miami, FL',
    genre: 'Reggae',
    capacity: 20000,
  },
];

const STAGE_TEMPLATES = [
  { name: 'Main Stage',        capacity: 10000, environment: 'outdoor', status: 'active', notes: 'Primary headliner stage with full production.' },
  { name: 'Electro Tent',      capacity: 3000,  environment: 'indoor',  status: 'active', notes: 'Air-conditioned tent with surround sound.' },
  { name: 'Acoustic Pavilion', capacity: 1500,  environment: 'outdoor', status: 'active', notes: 'Intimate setting for acoustic and folk acts.' },
  { name: 'Jazz Lounge',       capacity: 500,   environment: 'indoor',  status: 'active', notes: 'Cozy indoor lounge for jazz and blues.' },
];

// Three non-overlapping slots per day.
const TIME_SLOTS = [
  { startTime: '12:00', endTime: '13:30' },
  { startTime: '15:00', endTime: '16:30' },
  { startTime: '19:00', endTime: '21:00' },
];

const ARTISTS = {
  'Main Stage': [
    'The Midnight Echo',  'Nova Storm',         'Electric Pulsewave',
    'Crimson Tide',       'Neon Wolves',         'Iron Reef',
    'Solar Flare',        'Thunder Road',        'The Voltage Kings',
    'Static Rain',        'Firewall',            'The Reckoning',
  ],
  'Electro Tent': [
    'DJ Vortex',          'Bassline Theory',    'Synthetic Dawn',
    'Neural Beat',        'Pulse Circuit',       'Neon Frequency',
    'Digital Storm',      'Bass Reactor',        'Electra Wave',
    'Circuit Breaker',    'Deep Carrier',        'HEXLINE',
  ],
  'Acoustic Pavilion': [
    'Luna Rivers',        'Wild Grass',          'The Mountain Folk',
    'River Wanderers',    'Timber & Stone',      'Prairie Wind',
    'Cedar Hollow',       'Golden Thread',       'Blue Ridge Echo',
    'Willow Creek',       'The Drifters\' Way',  'Sunlit Hollow',
  ],
  'Jazz Lounge': [
    'The Blue Note Quartet',   'Smooth Horizon',         'Midnight Jazz Ensemble',
    'The Velvet Collective',   'Brass & Soul',           'The Bebop Society',
    'Jazz Fusion Project',     'Nocturne Quartet',       'The Swing Revival',
    'Blue Monk Trio',          'Sunday Sessions Band',   'The Uptown Five',
  ],
};

const GENRES = {
  'Main Stage':        'Rock',
  'Electro Tent':      'Electronic',
  'Acoustic Pavilion': 'Folk',
  'Jazz Lounge':       'Jazz',
};

// ---- Helpers ----------------------------------------------------------------

function datePlusDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function festivalDates(startDate, endDate) {
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = datePlusDays(current, 1);
  }
  return dates;
}

// ---- Main -------------------------------------------------------------------

async function seed() {
  await connectDB();

  console.log('Clearing existing data…');
  await Promise.all([
    Festival.deleteMany({}),
    Stage.deleteMany({}),
    Performance.deleteMany({}),
  ]);

  let totalPerformances = 0;

  for (const festDef of FESTIVAL_DEFS) {
    // Create festival
    const festival = await new Festival(festDef).save();
    const fid = festival._id.toString();
    console.log(`\nCreated festival: ${festival.name} (${fid})`);

    // Create stages
    for (const tmpl of STAGE_TEMPLATES) {
      await new Stage({ ...tmpl, festivalId: fid }).save();
    }
    console.log(`  Created ${STAGE_TEMPLATES.length} stages`);

    // Create performances — 3 slots × N days × 4 stages
    const dates = festivalDates(festDef.startDate, festDef.endDate);
    let perfCount = 0;

    for (const stageTmpl of STAGE_TEMPLATES) {
      const artists = ARTISTS[stageTmpl.name];
      let artistIdx = 0;

      for (const date of dates) {
        for (const slot of TIME_SLOTS) {
          await new Performance({
            festivalId: fid,
            artistName: artists[artistIdx % artists.length],
            stageName:  stageTmpl.name,
            date,
            startTime:  slot.startTime,
            endTime:    slot.endTime,
            genre:      GENRES[stageTmpl.name],
          }).save();

          artistIdx++;
          perfCount++;
          totalPerformances++;
        }
      }
    }

    console.log(`  Created ${perfCount} performances across ${dates.length} days`);
  }

  console.log(`\nSeed complete!`);
  console.log(`  Festivals:    ${FESTIVAL_DEFS.length}`);
  console.log(`  Stages:       ${FESTIVAL_DEFS.length * STAGE_TEMPLATES.length}`);
  console.log(`  Performances: ${totalPerformances}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
