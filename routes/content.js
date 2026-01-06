const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const adminAuth = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/content/:page
// @desc    Get content for a specific page
// @access  Public
router.get('/:page', async (req, res) => {
  try {
    const { page } = req.params;
    
    let content = await Content.findOne({ page, isPublished: true });
    
    // If content doesn't exist, create default content
    if (!content) {
      content = await Content.create({
        page,
        hero: {
          title: `Welcome to ${page.charAt(0).toUpperCase() + page.slice(1)}`,
          subtitle: 'Discover luxury and comfort',
          description: 'Experience the finest hospitality'
        },
        sections: [],
        seo: {
          title: `${page.charAt(0).toUpperCase() + page.slice(1)} - The Old Vine Hotel`,
          description: `Explore our ${page} page`
        },
        isPublished: true
      });
    }

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content'
    });
  }
});

// @route   PUT /api/content/:page
// @desc    Update content for a specific page
// @access  Private (Admin)
router.put('/:page', adminAuth, async (req, res) => {
  try {
    const { page } = req.params;
    const { hero, sections, seo, isPublished } = req.body;

    let content = await Content.findOne({ page });

    if (!content) {
      // Create new content
      content = new Content({
        page,
        hero,
        sections,
        seo,
        isPublished,
        lastModifiedBy: req.admin.id
      });
    } else {
      // Update existing content
      if (hero) content.hero = hero;
      if (sections) content.sections = sections;
      if (seo) content.seo = seo;
      if (typeof isPublished !== 'undefined') content.isPublished = isPublished;
      content.lastModifiedBy = req.admin.id;
    }

    await content.save();

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: { content }
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating content'
    });
  }
});

// @route   GET /api/content
// @desc    Get all content pages (admin)
// @access  Private (Admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const contents = await Content.find()
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ page: 1 });

    res.json({
      success: true,
      data: { contents }
    });
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content'
    });
  }
});

// @route   POST /api/content/:page/section
// @desc    Add a section to page content
// @access  Private (Admin)
router.post('/:page/section', adminAuth, async (req, res) => {
  try {
    const { page } = req.params;
    const section = req.body;

    const content = await Content.findOne({ page });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content page not found'
      });
    }

    // Set section order if not provided
    if (!section.order) {
      section.order = content.sections.length;
    }

    content.sections.push(section);
    content.lastModifiedBy = req.admin.id;
    await content.save();

    res.json({
      success: true,
      message: 'Section added successfully',
      data: { content }
    });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding section'
    });
  }
});

// @route   DELETE /api/content/:page/section/:sectionId
// @desc    Remove a section from page content
// @access  Private (Admin)
router.delete('/:page/section/:sectionId', adminAuth, async (req, res) => {
  try {
    const { page, sectionId } = req.params;

    const content = await Content.findOne({ page });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content page not found'
      });
    }

    content.sections = content.sections.filter(
      section => section.sectionId !== sectionId
    );

    content.lastModifiedBy = req.admin.id;
    await content.save();

    res.json({
      success: true,
      message: 'Section removed successfully',
      data: { content }
    });
  } catch (error) {
    console.error('Remove section error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing section'
    });
  }
});

module.exports = router;

