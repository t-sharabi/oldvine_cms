const mongoose = require('mongoose');

const roomCategorySchema = new mongoose.Schema({
  // Basic category information
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  
  // Category images (gallery)
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Pricing information (range for this category)
  priceRange: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 0
    }
  },
  
  // Category features/amenities (common to all rooms in this category)
  features: [{
    type: String
  }],
  
  // SEO and metadata
  metaTitle: String,
  metaDescription: String,
  
  // Display settings
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Statistics (calculated)
  roomCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomCategorySchema.index({ slug: 1 });
roomCategorySchema.index({ isActive: 1, displayOrder: 1 });

// Pre-save middleware to generate slug
roomCategorySchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Virtual for primary image
roomCategorySchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Virtual for image count
roomCategorySchema.virtual('imageCount').get(function() {
  return this.images.length;
});

module.exports = mongoose.model('RoomCategory', roomCategorySchema);

