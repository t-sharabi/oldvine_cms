const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  // Content identification
  page: {
    type: String,
    required: true,
    unique: true,
    enum: ['home', 'about', 'contact', 'rooms', 'facilities', 'gallery']
  },
  
  // Hero section
  hero: {
    title: String,
    subtitle: String,
    description: String,
    backgroundImage: String,
    ctaText: String,
    ctaLink: String
  },
  
  // Page sections (flexible structure for different pages)
  sections: [{
    sectionId: String, // e.g., 'welcome', 'features', 'testimonials'
    title: String,
    subtitle: String,
    content: String,
    image: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    },
    // Additional fields for different section types
    items: [mongoose.Schema.Types.Mixed], // For lists, features, etc.
    backgroundImage: String,
    backgroundVideo: String,
    layout: String // 'left-image', 'right-image', 'full-width', etc.
  }],
  
  // Meta information for SEO
  seo: {
    title: String,
    description: String,
    keywords: [String],
    ogImage: String,
    canonicalUrl: String
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: Date,
  
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

// Indexes
contentSchema.index({ page: 1 });
contentSchema.index({ isPublished: 1 });

// Pre-save middleware to update version and publish date
contentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  
  if (this.isModified('isPublished') && this.isPublished) {
    this.publishedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Content', contentSchema);

