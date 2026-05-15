const mongoose = require('mongoose');

const { Schema } = mongoose;

// Stores OAuth tokens for a user's Google Calendar connection so we can add events on their behalf.
const googleCalendarTokenSchema = new Schema(
  {
    // Stable client-side identifier that ties a browser session to its stored token.
    deviceUserId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    // Short-lived credential used to make Google API requests.
    accessToken: {
      type: String,
      default: '',
      trim: true,
    },
    // Long-lived credential used to obtain a new access token when the current one expires.
    refreshToken: {
      type: String,
      default: '',
      trim: true,
    },
    // Permissions granted by the user during OAuth consent.
    scope: {
      type: String,
      default: '',
      trim: true,
    },
    // Google-defined token type, almost always "Bearer".
    tokenType: {
      type: String,
      default: '',
      trim: true,
    },
    // When the access token stops being valid and needs refreshing.
    expiryDate: {
      type: Date,
      default: null,
    },
    // Which calendar events should be written to (defaults to the user's primary calendar).
    calendarId: {
      type: String,
      default: 'primary',
      trim: true,
    },
    // Timestamp of the most recent OAuth flow completion for this user.
    lastAuthorizedAt: {
      type: Date,
      default: Date.now,
    },
    // Timestamp of the most recent calendar API call, useful for auditing stale connections.
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Explicit collection name so the token store is easy to identify in the database.
    collection: 'google_calendar_tokens',
    // Adds createdAt/updatedAt automatically.
    timestamps: true,
  }
);

// Reuse existing model in watch/hot-reload contexts to avoid OverwriteModelError.
module.exports =
  mongoose.models.GoogleCalendarToken ||
  mongoose.model('GoogleCalendarToken', googleCalendarTokenSchema);