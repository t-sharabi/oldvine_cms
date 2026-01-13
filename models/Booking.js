const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Booking identification
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  confirmationCode: {
    type: String,
    required: true,
    unique: true
  },
  
  // Guest information
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  
  // Room and dates
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  
  // Guest details
  numberOfGuests: {
    adults: {
      type: Number,
      required: true,
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Pricing
  roomRate: {
    type: Number,
    required: true
  },
  numberOfNights: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  taxes: {
    type: Number,
    required: true
  },
  fees: {
    type: Number,
    default: 0
  },
  discounts: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially Paid', 'Refunded', 'Failed'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online Payment']
  },
  stripePaymentIntentId: String,
  
  // Booking status
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'No Show'],
    default: 'Pending'
  },
  
  // Special requests and notes
  specialRequests: {
    type: String,
    maxlength: 1000
  },
  internalNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Check-in/out details
  actualCheckInTime: Date,
  actualCheckOutTime: Date,
  earlyCheckIn: {
    type: Boolean,
    default: false
  },
  lateCheckOut: {
    type: Boolean,
    default: false
  },
  
  // Booking source
  bookingSource: {
    type: String,
    enum: ['Direct', 'Booking.com', 'Expedia', 'Trip.com', 'Phone', 'Walk-in', 'Travel Agent'],
    default: 'Direct'
  },
  
  // External system IDs
  operaBookingId: String,
  externalBookingId: String, // ID from booking platforms
  
  // Cancellation
  cancellationReason: String,
  cancellationDate: Date,
  cancellationFee: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  
  // Communication
  emailConfirmationSent: {
    type: Boolean,
    default: false
  },
  smsConfirmationSent: {
    type: Boolean,
    default: false
  },
  
  // Additional services
  addOns: [{
    service: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number
  }],
  
  // Group booking
  isGroupBooking: {
    type: Boolean,
    default: false
  },
  groupSize: Number,
  groupLeader: String,
  
  // Loyalty program
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  },
  loyaltyPointsRedeemed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ confirmationCode: 1 });
bookingSchema.index({ guest: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingSource: 1 });
bookingSchema.index({ operaBookingId: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for booking duration
bookingSchema.virtual('duration').get(function() {
  if (this.checkInDate && this.checkOutDate) {
    const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Pre-save middleware to generate booking number and confirmation code
bookingSchema.pre('validate', function(next) {
  if (!this.bookingNumber) {
    // Generate booking number: OVH + year + random 6 digits
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    this.bookingNumber = `OVH${year}${random}`;
  }
  
  if (!this.confirmationCode) {
    // Generate confirmation code: 8 character alphanumeric
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.confirmationCode = code;
  }
  
  // Calculate number of nights if not set
  if (!this.numberOfNights && this.checkInDate && this.checkOutDate) {
    const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
    this.numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  next();
});

// Static method to generate revenue reports
bookingSchema.statics.generateRevenueReport = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: { $in: ['Confirmed', 'Checked In', 'Checked Out'] },
        checkInDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$checkInDate' },
          month: { $month: '$checkInDate' },
          day: { $dayOfMonth: '$checkInDate' }
        },
        totalRevenue: { $sum: '$totalAmount' },
        bookingsCount: { $sum: 1 },
        averageRate: { $avg: '$roomRate' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

// Instance method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const checkInDate = new Date(this.checkInDate);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
  
  return (
    this.status === 'Confirmed' && 
    hoursUntilCheckIn > 24 // Can cancel up to 24 hours before check-in
  );
};

// Instance method to calculate cancellation fee
bookingSchema.methods.calculateCancellationFee = function() {
  const now = new Date();
  const checkInDate = new Date(this.checkInDate);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
  
  if (hoursUntilCheckIn > 48) {
    return 0; // Free cancellation
  } else if (hoursUntilCheckIn > 24) {
    return this.totalAmount * 0.25; // 25% fee
  } else {
    return this.totalAmount * 0.50; // 50% fee
  }
};

module.exports = mongoose.model('Booking', bookingSchema);