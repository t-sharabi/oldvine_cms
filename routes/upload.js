const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const adminAuth = require('../middleware/adminAuth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../client/public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   POST /api/upload
// @desc    Upload single or multiple images
// @access  Private (Admin)
router.post('/', adminAuth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        try {
          // Optimize image with sharp
          const optimizedPath = path.join(uploadsDir, `optimized-${file.filename}`);
          
          await sharp(file.path)
            .resize(1920, 1080, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toFile(optimizedPath);

          // Replace original with optimized
          fs.unlinkSync(file.path);
          fs.renameSync(optimizedPath, file.path);

          return {
            filename: file.filename,
            originalName: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date()
          };
        } catch (error) {
          console.error('Error processing image:', error);
          return {
            filename: file.filename,
            originalName: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            error: 'Optimization failed'
          };
        }
      })
    );

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: { files: uploadedFiles }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading files'
    });
  }
});

// @route   GET /api/upload/list
// @desc    Get list of uploaded files
// @access  Private (Admin)
router.get('/list', adminAuth, async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    
    const fileList = files
      .filter(file => !file.startsWith('.')) // Ignore hidden files
      .map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt); // Sort by newest first

    res.json({
      success: true,
      data: { files: fileList, total: fileList.length }
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing files'
    });
  }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete an uploaded file
// @access  Private (Admin)
router.delete('/:filename', adminAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file'
    });
  }
});

module.exports = router;

