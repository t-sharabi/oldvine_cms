const express = require('express');
const router = express.Router();
const RoomCategory = require('../models/RoomCategory');
const Room = require('../models/Room');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/room-categories
// @desc    Get all active room categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await RoomCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Calculate room count and price range for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const rooms = await Room.find({
          category: category._id,
          isActive: true
        }).lean();

        const prices = rooms.map(r => r.basePrice).filter(p => p > 0);
        
        return {
          ...category,
          roomCount: rooms.length,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0
          },
          primaryImage: category.images.find(img => img.isPrimary)?.url || 
                        (category.images.length > 0 ? category.images[0].url : null),
          imageCount: category.images.length
        };
      })
    );

    res.json({
      success: true,
      data: { categories: categoriesWithStats }
    });
  } catch (error) {
    console.error('Error fetching room categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room categories'
    });
  }
});

// @route   GET /api/room-categories/:slug
// @desc    Get single room category with all images and rooms
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const category = await RoomCategory.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Room category not found'
      });
    }

    // Get all rooms in this category
    const rooms = await Room.find({
      category: category._id,
      isActive: true
    })
      .sort({ basePrice: 1 })
      .lean();

    // Calculate price range
    const prices = rooms.map(r => r.basePrice).filter(p => p > 0);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };

    const categoryData = category.toObject();
    categoryData.rooms = rooms;
    categoryData.roomCount = rooms.length;
    categoryData.priceRange = priceRange;
    categoryData.primaryImage = category.primaryImage;
    categoryData.imageCount = category.images.length;

    res.json({
      success: true,
      data: { category: categoryData }
    });
  } catch (error) {
    console.error('Error fetching room category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room category'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// @route   GET /api/room-categories/admin/all
// @desc    Get all room categories (including inactive) - Admin only
// @access  Private/Admin
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const categories = await RoomCategory.find()
      .sort({ displayOrder: 1, name: 1 });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching all room categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room categories'
    });
  }
});

// @route   POST /api/room-categories
// @desc    Create a new room category - Admin only
// @access  Private/Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const category = new RoomCategory(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Room category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error creating room category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating room category'
    });
  }
});

// @route   PUT /api/room-categories/:id
// @desc    Update a room category - Admin only
// @access  Private/Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const category = await RoomCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Room category not found'
      });
    }

    res.json({
      success: true,
      message: 'Room category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Error updating room category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating room category'
    });
  }
});

// @route   DELETE /api/room-categories/:id
// @desc    Delete a room category - Admin only
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    // Check if any rooms are using this category
    const roomsCount = await Room.countDocuments({ category: req.params.id });
    
    if (roomsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${roomsCount} room(s) are using this category. Please reassign rooms first.`
      });
    }

    const category = await RoomCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Room category not found'
      });
    }

    res.json({
      success: true,
      message: 'Room category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room category'
    });
  }
});

module.exports = router;

