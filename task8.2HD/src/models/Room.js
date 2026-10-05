const mongoose = require('mongoose');


const RoomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    building: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['single', 'double', 'triple', 'dorm', 'suite'],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    occupied: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerMonth: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'maintenance'],
      default: 'available',
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
        description: {
      type: String,
      trim: true,
      default: '',
    },
    // Soft delete: archived rooms are hidden from students and the active
    // admin list, but the record (and its history) is kept.
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

RoomSchema.pre('save', function () {
  if (this.status !== 'maintenance') {
    if (this.occupied >= this.capacity) {
      this.status = 'occupied';
    } else if (this.status === 'occupied' && this.occupied < this.capacity) {
      this.status = 'available';
    }
  }
});


RoomSchema.index({ status: 1, type: 1, pricePerMonth: 1 });
RoomSchema.index({ isArchived: 1 });

module.exports = mongoose.model('Room', RoomSchema);