const mongoose = require('mongoose');

const galleryCategorySchema = new mongoose.Schema({
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
    required: false
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
  
  // Display settings
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // SEO and metadata
  metaTitle: String,
  metaDescription: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
galleryCategorySchema.index({ slug: 1 });
galleryCategorySchema.index({ isActive: 1, displayOrder: 1 });

// Pre-save middleware to generate slug
galleryCategorySchema.pre('save', function(next) {
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
galleryCategorySchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Virtual for image count
galleryCategorySchema.virtual('imageCount').get(function() {
  return this.images.length;
});

module.exports = mongoose.model('GalleryCategory', galleryCategorySchema);

