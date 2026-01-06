const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const adminAuth = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/blog
// @desc    Get published blog posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      tag, 
      page = 1, 
      limit = 10,
      featured = false
    } = req.query;

    const skip = (page - 1) * limit;

    const posts = await BlogPost.getPublished({
      category,
      tag,
      limit: parseInt(limit),
      skip,
      featured: featured === 'true'
    });

    const total = await BlogPost.countDocuments({
      status: 'published',
      publishedAt: { $lte: new Date() },
      ...(category && { category }),
      ...(tag && { tags: tag }),
      ...(featured === 'true' && { isFeatured: true })
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog posts'
    });
  }
});

// @route   GET /api/blog/:slug
// @desc    Get single blog post by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ 
      slug, 
      status: 'published',
      publishedAt: { $lte: new Date() }
    }).populate('author', 'firstName lastName avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment views
    await BlogPost.incrementViews(post._id);

    // Get related posts
    const relatedPosts = await post.getRelatedPosts(3);

    res.json({
      success: true,
      data: {
        post,
        relatedPosts
      }
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog post'
    });
  }
});

// @route   GET /api/blog/admin/all
// @desc    Get all blog posts (admin)
// @access  Private (Admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const posts = await BlogPost.find(query)
      .populate('author', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog posts'
    });
  }
});

// @route   POST /api/blog
// @desc    Create new blog post
// @access  Private (Admin)
router.post('/', adminAuth, [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('excerpt').notEmpty().trim().withMessage('Excerpt is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const postData = {
      ...req.body,
      author: req.admin.id
    };

    const post = new BlogPost(postData);
    await post.save();

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating blog post'
    });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update blog post
// @access  Private (Admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating blog post'
    });
  }
});

// @route   DELETE /api/blog/:id
// @desc    Delete blog post
// @access  Private (Admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await BlogPost.findByIdAndDelete(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog post'
    });
  }
});

// @route   GET /api/blog/categories/list
// @desc    Get list of all categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await BlogPost.distinct('category');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// @route   GET /api/blog/tags/list
// @desc    Get list of all tags
// @access  Public
router.get('/tags/list', async (req, res) => {
  try {
    const tags = await BlogPost.distinct('tags');

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tags'
    });
  }
});

module.exports = router;

