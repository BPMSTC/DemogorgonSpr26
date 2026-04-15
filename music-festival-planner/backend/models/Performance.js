const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema(
  {
    festivalId: { type: String, required: true, index: true },
    artistName: { type: String, required: true, trim: true },
    stageName:  { type: String, required: true },
    date:       { type: String, required: true },
    startTime:  { type: String, required: true },
    endTime:    { type: String, required: true },
    genre:      { type: String },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('Performance', PerformanceSchema);
