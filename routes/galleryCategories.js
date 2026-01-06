const express = require('express');
const router = express.Router();
const GalleryCategory = require('../models/GalleryCategory');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/gallery-categories
// @desc    Get all active gallery categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await GalleryCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Add virtual properties
    const categoriesWithStats = categories.map((category) => ({
      ...category,
      primaryImage: category.images.find(img => img.isPrimary)?.url || 
                    (category.images.length > 0 ? category.images[0].url : null),
      imageCount: category.images.length
    }));

    res.json({
      success: true,
      data: { categories: categoriesWithStats }
    });
  } catch (error) {
    console.error('Error fetching gallery categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery categories'
    });
  }
});

// @route   GET /api/gallery-categories/:slug
// @desc    Get single gallery category with all images
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const category = await GalleryCategory.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Gallery category not found'
      });
    }

    const categoryData = category.toObject();
    categoryData.primaryImage = category.primaryImage;
    categoryData.imageCount = category.images.length;

    res.json({
      success: true,
      data: { category: categoryData }
    });
  } catch (error) {
    console.error('Error fetching gallery category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery category'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// @route   GET /api/gallery-categories/admin/all
// @desc    Get all gallery categories (including inactive) - Admin only
// @access  Private/Admin
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const categories = await GalleryCategory.find()
      .sort({ displayOrder: 1, name: 1 });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching all gallery categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery categories'
    });
  }
});

// @route   POST /api/gallery-categories
// @desc    Create a new gallery category - Admin only
// @access  Private/Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const category = new GalleryCategory(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Gallery category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error creating gallery category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating gallery category'
    });
  }
});

// @route   PUT /api/gallery-categories/:id
// @desc    Update a gallery category - Admin only
// @access  Private/Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const category = await GalleryCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Gallery category not found'
      });
    }

    res.json({
      success: true,
      message: 'Gallery category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error updating gallery category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating gallery category'
    });
  }
});

// @route   DELETE /api/gallery-categories/:id
// @desc    Delete a gallery category - Admin only
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const category = await GalleryCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Gallery category not found'
      });
    }

    res.json({
      success: true,
      message: 'Gallery category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gallery category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting gallery category'
    });
  }
});

module.exports = router;

