const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guestSchema = new mongoose.Schema({
  // Personal information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Authentication
  password: {
    type: String,
    minlength: 6,
    select: false // Don't include in queries by default
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Personal details
  dateOfBirth: Date,
  nationality: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  
  // Identification
  idType: {
    type: String,
    enum: ['Passport', 'Driver License', 'National ID', 'Other']
  },
  idNumber: String,
  idExpiryDate: Date,
  
  // Preferences
  preferences: {
    roomType: {
      type: String,
      enum: ['Standard', 'Deluxe', 'Suite', 'Executive Suite', 'Presidential Suite']
    },
    bedPreference: {
      type: String,
      enum: ['Single', 'Double', 'Queen', 'King', 'Twin']
    },
    smokingPreference: {
      type: String,
      enum: ['Non-smoking', 'Smoking'],
      default: 'Non-smoking'
    },
    floorPreference: {
      type: String,
      enum: ['Low', 'High', 'No preference'],
      default: 'No preference'
    },
    viewPreference: {
      type: String,
      enum: ['Ocean', 'City', 'Garden', 'Mountain', 'No preference'],
      default: 'No preference'
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Special requirements
  specialRequirements: {
    accessibility: {
      wheelchairAccess: { type: Boolean, default: false },
      hearingImpaired: { type: Boolean, default: false },
      visuallyImpaired: { type: Boolean, default: false },
      other: String
    },
    dietaryRestrictions: [{
      type: String,
      enum: ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Diabetic', 'Other']
    }],
    allergies: [String],
    medicalConditions: String
  },
  
  // Loyalty program
  loyaltyProgram: {
    memberId: String,
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },
    points: {
      type: Number,
      default: 0
    },
    joinDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Communication preferences
  communicationPreferences: {
    email: {
      marketing: { type: Boolean, default: false },
      bookingUpdates: { type: Boolean, default: true },
      specialOffers: { type: Boolean, default: false }
    },
    sms: {
      marketing: { type: Boolean, default: false },
      bookingUpdates: { type: Boolean, default: false },
      specialOffers: { type: Boolean, default: false }
    },
    phone: {
      marketing: { type: Boolean, default: false },
      bookingUpdates: { type: Boolean, default: false }
    }
  },
  
  // Guest history
  totalStays: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastStayDate: Date,
  averageRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // VIP status
  isVIP: {
    type: Boolean,
    default: false
  },
  vipNotes: String,
  
  // External system IDs
  operaGuestId: String,
  externalGuestIds: [{
    system: String, // 'booking.com', 'expedia', etc.
    id: String
  }],
  
  // Emergency contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: String,
  
  // Verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Notes and comments
  internalNotes: String,
  
  // GDPR compliance
  dataConsent: {
    type: Boolean,
    default: false
  },
  consentDate: Date,
  
  // Last activity
  lastLogin: Date,
  lastActivity: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
guestSchema.index({ email: 1 });
guestSchema.index({ phone: 1 });
guestSchema.index({ 'loyaltyProgram.memberId': 1 });
guestSchema.index({ operaGuestId: 1 });
guestSchema.index({ isVIP: 1 });
guestSchema.index({ totalStays: -1 });
guestSchema.index({ totalSpent: -1 });

// Virtual for full name
guestSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for formatted address
guestSchema.virtual('formattedAddress').get(function() {
  if (!this.address || !this.address.street) return '';
  
  const { street, city, state, country, zipCode } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

// Pre-save middleware to hash password
guestSchema.pre('save', async function(next) {
  // Only hash password if it's modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
guestSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update loyalty points
guestSchema.methods.addLoyaltyPoints = function(points) {
  this.loyaltyProgram.points += points;
  
  // Update tier based on points
  if (this.loyaltyProgram.points >= 10000) {
    this.loyaltyProgram.tier = 'Platinum';
  } else if (this.loyaltyProgram.points >= 5000) {
    this.loyaltyProgram.tier = 'Gold';
  } else if (this.loyaltyProgram.points >= 1000) {
    this.loyaltyProgram.tier = 'Silver';
  }
  
  return this.save();
};

// Method to update stay statistics
guestSchema.methods.updateStayStats = function(stayAmount) {
  this.totalStays += 1;
  this.totalSpent += stayAmount;
  this.lastStayDate = new Date();
  
  // Check VIP status
  if (this.totalStays >= 10 && this.totalSpent >= 5000) {
    this.isVIP = true;
  }
  
  return this.save();
};

// Static method to find VIP guests
guestSchema.statics.findVIPGuests = function() {
  return this.find({ isVIP: true, isActive: true })
    .sort({ totalSpent: -1 })
    .select('firstName lastName email phone totalStays totalSpent loyaltyProgram');
};

// Static method to find guests by loyalty tier
guestSchema.statics.findByLoyaltyTier = function(tier) {
  return this.find({ 
    'loyaltyProgram.tier': tier,
    isActive: true 
  }).sort({ 'loyaltyProgram.points': -1 });
};

// Method to generate password reset token
guestSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

module.exports = mongoose.model('Guest', guestSchema);