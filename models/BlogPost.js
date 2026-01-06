const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  // Post information
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true
  },
  
  // Media
  featuredImage: {
    url: String,
    alt: String,
    caption: String
  },
  images: [{
    url: String,
    alt: String,
    caption: String
  }],
  
  // Categorization
  category: {
    type: String,
    required: true,
    enum: [
      'News', 'Events', 'Travel Tips', 'Local Attractions', 
      'Hotel Updates', 'Food & Dining', 'Spa & Wellness', 
      'Special Offers', 'Guest Stories', 'Behind the Scenes'
    ]
  },
  tags: [String],
  
  // Author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  scheduledPublishAt: Date,
  
  // Engagement
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  
  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String],
    ogImage: String,
    canonicalUrl: String
  },
  
  // Features
  isFeatured: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  
  // Related content
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ isFeatured: 1 });

// Virtual for reading time (based on word count)
blogPostSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
});

// Virtual for is published
blogPostSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.publishedAt && this.publishedAt <= new Date();
});

// Pre-save middleware to generate slug and handle publishing
blogPostSchema.pre('save', function(next) {
  // Generate slug if modified or new
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Generate SEO fields from content if not set
  if (!this.seo.title) {
    this.seo.title = this.title;
  }
  if (!this.seo.description) {
    this.seo.description = this.excerpt;
  }
  
  next();
});

// Static method to get published posts
blogPostSchema.statics.getPublished = function(options = {}) {
  const {
    category,
    tag,
    limit = 10,
    skip = 0,
    featured = false
  } = options;
  
  const query = {
    status: 'published',
    publishedAt: { $lte: new Date() }
  };
  
  if (category) query.category = category;
  if (tag) query.tags = tag;
  if (featured) query.isFeatured = true;
  
  return this.find(query)
    .populate('author', 'firstName lastName avatar')
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to increment views
blogPostSchema.statics.incrementViews = function(postId) {
  return this.findByIdAndUpdate(postId, { $inc: { views: 1 } });
};

// Instance method to get related posts
blogPostSchema.methods.getRelatedPosts = async function(limit = 3) {
  return this.model('BlogPost').find({
    _id: { $ne: this._id },
    status: 'published',
    publishedAt: { $lte: new Date() },
    $or: [
      { category: this.category },
      { tags: { $in: this.tags } }
    ]
  })
  .populate('author', 'firstName lastName avatar')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('BlogPost', blogPostSchema);

