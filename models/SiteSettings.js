const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  // Hotel information
  hotel: {
    name: {
      type: String,
      required: true,
      default: 'The Old Vine Hotel'
    },
    tagline: String,
    description: String,
    logo: String,
    favicon: String,
    
    // Contact information
    phone: String,
    email: String,
    whatsapp: String,
    website: String,
    
    // Address
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      formatted: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    // Social media
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      youtube: String,
      tiktok: String
    },
    
    // Business hours
    businessHours: {
      checkIn: { type: String, default: '14:00' },
      checkOut: { type: String, default: '11:00' },
      reception: {
        weekday: String,
        weekend: String
      }
    }
  },
  
  // Theme and styling
  theme: {
    // Color palette
    colors: {
      primary: { type: String, default: '#1F423C' },
      primaryLight: { type: String, default: '#3A635F' },
      primaryDark: { type: String, default: '#0F2A26' },
      secondary: { type: String, default: '#9AD4BD' },
      secondaryLight: { type: String, default: '#B0E0D0' },
      secondaryDark: { type: String, default: '#7CBF9E' },
      tertiary: { type: String, default: '#A8A8A8' },
      background: { type: String, default: '#F8F6F3' },
      backgroundAlt: { type: String, default: '#E0E8E6' },
      text: { type: String, default: '#231F20' },
      textSecondary: { type: String, default: '#6D6E6E' }
    },
    
    // Typography
    fonts: {
      heading: { type: String, default: 'Cormorant Garamond' },
      body: { type: String, default: 'Cairo' },
      headingWeight: { type: String, default: '600' },
      bodyWeight: { type: String, default: '400' }
    },
    
    // Layout
    layout: {
      headerStyle: { type: String, default: 'transparent' },
      footerStyle: { type: String, default: 'dark' },
      borderRadius: { type: String, default: '4px' },
      spacing: { type: String, default: 'comfortable' }
    }
  },
  
  // SEO settings
  seo: {
    defaultTitle: String,
    titleTemplate: String, // e.g., '%s | The Old Vine Hotel'
    defaultDescription: String,
    keywords: [String],
    ogImage: String,
    twitterHandle: String,
    googleAnalyticsId: String,
    googleTagManagerId: String,
    facebookPixelId: String
  },
  
  // Booking settings
  booking: {
    enabled: { type: Boolean, default: true },
    minNights: { type: Number, default: 1 },
    maxNights: { type: Number, default: 30 },
    advanceBookingDays: { type: Number, default: 365 },
    cancellationPolicy: String,
    depositRequired: { type: Boolean, default: false },
    depositPercentage: { type: Number, default: 30 },
    taxRate: { type: Number, default: 10 },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' }
  },
  
  // Email settings
  email: {
    fromName: String,
    fromEmail: String,
    replyToEmail: String,
    bookingConfirmationEnabled: { type: Boolean, default: true },
    bookingReminderEnabled: { type: Boolean, default: true },
    newsletterEnabled: { type: Boolean, default: true }
  },
  
  // Feature flags
  features: {
    blog: { type: Boolean, default: true },
    gallery: { type: Boolean, default: true },
    testimonials: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    liveChat: { type: Boolean, default: false },
    multiLanguage: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false }
  },
  
  // Languages
  languages: {
    default: { type: String, default: 'en' },
    available: [{ type: String, default: ['en', 'ar', 'fr'] }],
    rtlLanguages: [{ type: String, default: ['ar'] }]
  },
  
  // Maintenance mode
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: String,
    allowedIPs: [String]
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  // Audit trail
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSiteSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

// Pre-save middleware to update version
siteSettingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);

