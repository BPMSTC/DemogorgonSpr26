const mongoose = require('mongoose');

const { Schema } = mongoose;

// Stage documents belong to a specific festival and represent physical venues.
const stageSchema = new Schema(
  {
    // Reference back to the parent festival.
    festival: {
      type: Schema.Types.ObjectId,
      ref: 'Festival',
      required: true,
      index: true,
    },
    // Stage display name shown in schedule and stage management pages.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Simple enum for environment-specific UI badges/filtering.
    environment: {
      type: String,
      enum: ['indoor', 'outdoor', 'tent', 'club'],
      default: 'outdoor',
    },
    // Capacity helps with realism and potential planning features later.
    capacity: {
      type: Number,
      min: 100,
      max: 200000,
      default: 1000,
    },
  },
  {
    collection: 'stages',
    timestamps: true,
  }
);

// A festival cannot have two stages with the same name.
stageSchema.index({ festival: 1, name: 1 }, { unique: true });

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports = mongoose.models.Stage || mongoose.model('Stage', stageSchema);
