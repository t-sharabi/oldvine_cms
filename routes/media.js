const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Media = require('../models/Media');
const adminAuth = require('../middleware/adminAuth');

// Ensure upload directories exist
const ensureUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = req.body.folder || 'general';
    const uploadPath = path.join(__dirname, '../../client/public/images', folder);
    await ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   POST /api/media/upload
// @desc    Upload media file
// @access  Private (Admin)
router.post('/upload', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { folder = 'general', alt, caption, description, tags } = req.body;

    // Determine media type
    let mediaType = 'other';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (req.file.mimetype === 'application/pdf') {
      mediaType = 'document';
    }

    // Create media record
    const media = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/images/${folder}/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      type: mediaType,
      folder,
      alt,
      caption,
      description,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: req.admin.id
    });

    await media.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: { media }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file'
    });
  }
});

// @route   POST /api/media/upload-multiple
// @desc    Upload multiple media files
// @access  Private (Admin)
router.post('/upload-multiple', adminAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { folder = 'general' } = req.body;
    const mediaRecords = [];

    for (const file of req.files) {
      let mediaType = 'other';
      if (file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimetype === 'application/pdf') {
        mediaType = 'document';
      }

      const media = new Media({
        filename: file.filename,
        originalName: file.originalname,
        url: `/images/${folder}/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        type: mediaType,
        folder,
        uploadedBy: req.admin.id
      });

      await media.save();
      mediaRecords.push(media);
    }

    res.status(201).json({
      success: true,
      message: `${mediaRecords.length} files uploaded successfully`,
      data: { media: mediaRecords }
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading files'
    });
  }
});

// @route   GET /api/media
// @desc    Get all media
// @access  Private (Admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { folder, type, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (folder) query.folder = folder;
    if (type) query.type = type;

    const media = await Media.find(query)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching media'
    });
  }
});

// @route   GET /api/media/search
// @desc    Search media
// @access  Private (Admin)
router.get('/search', adminAuth, async (req, res) => {
  try {
    const { q, folder, type, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const media = await Media.search(q, { folder, type, limit: parseInt(limit) });

    res.json({
      success: true,
      data: { media }
    });
  } catch (error) {
    console.error('Search media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching media'
    });
  }
});

// @route   PUT /api/media/:id
// @desc    Update media metadata
// @access  Private (Admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { alt, caption, description, tags, folder } = req.body;

    const updateFields = {};
    if (alt) updateFields.alt = alt;
    if (caption) updateFields.caption = caption;
    if (description) updateFields.description = description;
    if (tags) updateFields.tags = tags;
    if (folder) updateFields.folder = folder;

    const media = await Media.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: { media }
    });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating media'
    });
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media file
// @access  Private (Admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../client/public', media.url);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    // Delete media record
    await Media.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting media'
    });
  }
});

// @route   GET /api/media/folders/list
// @desc    Get list of all folders
// @access  Private (Admin)
router.get('/folders/list', adminAuth, async (req, res) => {
  try {
    const folders = await Media.distinct('folder');

    res.json({
      success: true,
      data: { folders }
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching folders'
    });
  }
});

module.exports = router;

