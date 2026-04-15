const mongoose = require('mongoose');

const FestivalSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    startDate: { type: String, required: true },
    endDate:   { type: String, required: true },
    location:  { type: String, required: true, trim: true },
    genre:     { type: String, trim: true },
    capacity:  { type: Number },
  },
  {
    toJSON: {
      // Map _id → id and strip __v so the Angular models match exactly.
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('Festival', FestivalSchema);
