const mongoose = require('mongoose');

const { Schema } = mongoose;

// Festival is the top-level event entity that other collections reference.
const festivalSchema = new Schema(
  {
    // Human-readable festival title shown in UI lists and detail views.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // City/region label used for browsing and filtering.
    location: {
      type: String,
      required: true,
      trim: true,
    },
    // Festival start boundary (date/time).
    startDate: {
      type: Date,
      required: true,
    },
    // Festival end boundary. Validator ensures it is not before startDate.
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(endDate) {
          return this.startDate <= endDate;
        },
        message: 'Festival endDate must be on or after startDate.',
      },
    },
    // Short description for cards/detail page content.
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Optional genre used by merged frontend/API flows.
    genre: {
      type: String,
      default: '',
      trim: true,
    },
    // Optional festival-level capacity used by merged frontend/API flows.
    capacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Hero/banner image URL placeholder for future UI use.
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    // Explicit collection name keeps naming consistent across environments.
    collection: 'festivals',
    // Adds createdAt/updatedAt automatically.
    timestamps: true,
  }
);

// Prevent duplicate festival records for the same name and start date.
festivalSchema.index({ name: 1, startDate: 1 }, { unique: true });

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports = mongoose.models.Festival || mongoose.model('Festival', festivalSchema);
