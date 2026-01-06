const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  // File information
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  
  // File details
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  
  // Media type
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'other'],
    required: true
  },
  
  // Image specific
  dimensions: {
    width: Number,
    height: Number
  },
  
  // Categorization
  folder: {
    type: String,
    default: 'general',
    enum: ['general', 'rooms', 'gallery', 'blog', 'hero', 'about', 'facilities', 'avatars']
  },
  tags: [String],
  
  // Metadata
  alt: String,
  caption: String,
  description: String,
  
  // Usage tracking
  usedIn: [{
    model: String, // 'Content', 'BlogPost', 'Room', etc.
    documentId: mongoose.Schema.Types.ObjectId,
    field: String
  }],
  
  // Upload information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Status
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
mediaSchema.index({ folder: 1, createdAt: -1 });
mediaSchema.index({ type: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ filename: 1 });

// Virtual for file extension
mediaSchema.virtual('extension').get(function() {
  return this.filename.split('.').pop().toLowerCase();
});

// Virtual for is image
mediaSchema.virtual('isImage').get(function() {
  return this.type === 'image';
});

// Virtual for file size in MB
mediaSchema.virtual('sizeInMB').get(function() {
  return (this.size / (1024 * 1024)).toFixed(2);
});

// Static method to get media by folder
mediaSchema.statics.getByFolder = function(folder, options = {}) {
  const { limit = 50, skip = 0, type } = options;
  
  const query = { folder };
  if (type) query.type = type;
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to search media
mediaSchema.statics.search = function(searchTerm, options = {}) {
  const { folder, type, limit = 50 } = options;
  
  const query = {
    $or: [
      { originalName: new RegExp(searchTerm, 'i') },
      { alt: new RegExp(searchTerm, 'i') },
      { caption: new RegExp(searchTerm, 'i') },
      { tags: new RegExp(searchTerm, 'i') }
    ]
  };
  
  if (folder) query.folder = folder;
  if (type) query.type = type;
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance method to track usage
mediaSchema.methods.addUsage = function(model, documentId, field) {
  this.usedIn.push({ model, documentId, field });
  return this.save();
};

// Instance method to remove usage
mediaSchema.methods.removeUsage = function(model, documentId, field) {
  this.usedIn = this.usedIn.filter(usage => 
    !(usage.model === model && usage.documentId.equals(documentId) && usage.field === field)
  );
  return this.save();
};

module.exports = mongoose.model('Media', mediaSchema);

