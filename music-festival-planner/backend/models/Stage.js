const mongoose = require('mongoose');

const StageSchema = new mongoose.Schema(
  {
    festivalId:  { type: String, required: true, index: true },
    name:        { type: String, required: true, trim: true },
    capacity:    { type: Number, required: true },
    environment: { type: String, enum: ['indoor', 'outdoor'], required: true },
    status:      { type: String, enum: ['active', 'inactive', 'under-repair'], required: true },
    notes:       { type: String, default: '' },
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

module.exports = mongoose.model('Stage', StageSchema);
