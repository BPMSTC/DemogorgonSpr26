const mongoose = require('mongoose');

const { Schema } = mongoose;

const googleCalendarTokenSchema = new Schema(
  {
    deviceUserId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    accessToken: {
      type: String,
      default: '',
      trim: true,
    },
    refreshToken: {
      type: String,
      default: '',
      trim: true,
    },
    scope: {
      type: String,
      default: '',
      trim: true,
    },
    tokenType: {
      type: String,
      default: '',
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    calendarId: {
      type: String,
      default: 'primary',
      trim: true,
    },
    lastAuthorizedAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'google_calendar_tokens',
    timestamps: true,
  }
);

module.exports =
  mongoose.models.GoogleCalendarToken ||
  mongoose.model('GoogleCalendarToken', googleCalendarTokenSchema);