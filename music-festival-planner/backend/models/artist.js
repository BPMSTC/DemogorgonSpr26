const mongoose = require('mongoose');

const { Schema } = mongoose;

// Artist is intentionally global (not festival-scoped) so the same artist
// can appear at different festivals and on multiple days.
const artistSchema = new Schema(
  {
    // Public-facing artist/band name.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // High-level category for browsing and filtering in UI.
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    // Brief biography/summary text for cards and detail sections.
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Placeholder image URL so UI design can be tested before real assets exist.
    imageUrl: {
      type: String,
      default: 'https://placehold.co/600x600?text=Artist+Image',
      trim: true,
    },
    // Optional metadata that can support future filtering or badges.
    country: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'artists',
    timestamps: true,
  },
);

// Keep artist names unique in this demo dataset to prevent accidental duplicates.
artistSchema.index({ name: 1 }, { unique: true });

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports = mongoose.models.Artist || mongoose.model('Artist', artistSchema);
