const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  // Basic room information
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Standard', 'Deluxe', 'Suite', 'Executive Suite', 'Presidential Suite'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomCategory',
    required: false // Optional for backward compatibility
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // Room specifications
  roomNumber: {
    type: String,
    required: true,
    unique: true
  },
  floor: {
    type: Number,
    required: true
  },
  size: {
    type: Number, // in square meters
    required: true
  },
  maxOccupancy: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  bedType: {
    type: String,
    required: true,
    enum: ['Single', 'Double', 'Queen', 'King', 'Twin', 'Sofa Bed']
  },
  bedCount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Pricing
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  seasonalPricing: [{
    season: String,
    startDate: Date,
    endDate: Date,
    priceMultiplier: Number // 1.2 for 20% increase
  }],
  
  // Room features and amenities
  amenities: [{
    type: String,
    enum: [
      'WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'Balcony', 'Ocean View', 
      'City View', 'Mountain View', 'Garden View', 'Jacuzzi', 'Fireplace',
      'Kitchen', 'Kitchenette', 'Workspace', 'Butler Service', 'Spa Access',
      'Private Pool', 'Terrace', 'Walk-in Closet', 'Sound System'
    ]
  }],
  
  // Media
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  virtualTour: {
    url: String,
    provider: String // '360°', 'Matterport', etc.
  },
  
  // Availability and status
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Out of Order', 'Maintenance'],
    default: 'Available'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Integration IDs for external systems
  operaRoomId: String, // Opera PMS room ID
  bookingComRoomId: String,
  expediaRoomId: String,
  tripComRoomId: String,
  
  // SEO and metadata
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  metaTitle: String,
  metaDescription: String,
  
  // Room policies
  smokingAllowed: {
    type: Boolean,
    default: false
  },
  petsAllowed: {
    type: Boolean,
    default: false
  },
  
  // Maintenance and housekeeping
  lastMaintenance: Date,
  lastCleaning: Date,
  cleaningStatus: {
    type: String,
    enum: ['Clean', 'Dirty', 'In Progress', 'Inspected'],
    default: 'Clean'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ type: 1, status: 1 });
roomSchema.index({ slug: 1 });
roomSchema.index({ category: 1 });
roomSchema.index({ operaRoomId: 1 });

// Virtual for current price (considering seasonal pricing)
roomSchema.virtual('currentPrice').get(function() {
  const now = new Date();
  const seasonalRate = this.seasonalPricing.find(pricing => 
    pricing.startDate <= now && pricing.endDate >= now
  );
  
  return seasonalRate 
    ? this.basePrice * seasonalRate.priceMultiplier 
    : this.basePrice;
});

// Pre-save middleware to generate slug
roomSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Static method to find available rooms
roomSchema.statics.findAvailable = function(checkIn, checkOut, guests = 1) {
  return this.aggregate([
    {
      $match: {
        status: 'Available',
        isActive: true,
        maxOccupancy: { $gte: guests }
      }
    },
    {
      $lookup: {
        from: 'bookings',
        let: { roomId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$room', '$$roomId'] },
              status: { $in: ['Confirmed', 'Checked In'] },
              $or: [
                {
                  checkInDate: { $lt: checkOut },
                  checkOutDate: { $gt: checkIn }
                }
              ]
            }
          }
        ],
        as: 'conflictingBookings'
      }
    },
    {
      $match: {
        conflictingBookings: { $size: 0 }
      }
    },
    {
      $project: {
        conflictingBookings: 0
      }
    }
  ]);
};

// Instance method to check availability
roomSchema.methods.isAvailable = async function(checkIn, checkOut) {
  const Booking = mongoose.model('Booking');
  
  const conflictingBooking = await Booking.findOne({
    room: this._id,
    status: { $in: ['Confirmed', 'Checked In'] },
    $or: [
      {
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn }
      }
    ]
  });
  
  return !conflictingBooking && this.status === 'Available' && this.isActive;
};

module.exports = mongoose.model('Room', roomSchema);