const mongoose = require('mongoose');

const { Schema } = mongoose;

// Performance (aka set) is the core scheduling document that links together
// one festival, one stage, and one artist within a time window.
const performanceSchema = new Schema(
  {
    // Which festival this set belongs to.
    festival: {
      type: Schema.Types.ObjectId,
      ref: 'Festival',
      required: true,
      index: true,
    },
    // Which artist is performing.
    artist: {
      type: Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
      index: true,
    },
    // Which stage hosts the performance.
    stage: {
      type: Schema.Types.ObjectId,
      ref: 'Stage',
      required: true,
      index: true,
    },
    // Start datetime for sorting and clash detection.
    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    // End datetime for duration/clash calculations.
    endDateTime: {
      type: Date,
      required: true,
      validate: {
        validator(endDateTime) {
          return this.startDateTime < endDateTime;
        },
        message: 'Performance endDateTime must be after startDateTime.',
      },
    },
    // Day bucket derived from startDateTime (midnight UTC), useful for
    // day tabs and grouping schedules.
    day: {
      type: Date,
      required: true,
      index: true,
    },
    // Free-form admin notes (optional, currently unused by UI).
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    // Optional genre mirrored from request payload for convenience in UI sorting/filtering.
    genre: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'performances',
    timestamps: true,
  }
);

// Keep `day` automatically in sync so seed/API callers only need to provide
// startDateTime/endDateTime.
performanceSchema.pre('validate', function setDayFromStart() {
  if (this.startDateTime) {
    const dayDate = new Date(this.startDateTime);
    dayDate.setUTCHours(0, 0, 0, 0);
    this.day = dayDate;
  }
});

// Indexes support common schedule queries:
// 1) festival timeline browse
performanceSchema.index({ festival: 1, startDateTime: 1 });
// 2) stage-specific lineup within a festival
performanceSchema.index({ festival: 1, stage: 1, startDateTime: 1 });
// 3) artist itinerary/history lookup
performanceSchema.index({ artist: 1, startDateTime: 1 });

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports =
  mongoose.models.Performance || mongoose.model('Performance', performanceSchema);
