const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const RoomCategory = require('../models/RoomCategory');
const { body, validationResult, query } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/rooms
// @desc    Get all rooms with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['Standard', 'Deluxe', 'Suite', 'Executive Suite', 'Presidential Suite']),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('guests').optional().isInt({ min: 1 }),
  query('checkIn').optional().isISO8601(),
  query('checkOut').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 12,
      type,
      category, // category slug or ID
      maxPrice,
      minPrice,
      guests,
      checkIn,
      checkOut,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    let filter = {
      isActive: true,
      status: 'Available'
    };

    if (type) filter.type = type;
    if (guests) filter.maxOccupancy = { $gte: parseInt(guests) };
    
    // Handle category filtering
    if (category) {
      // Try to find category by slug first, then by ID
      const categoryDoc = await RoomCategory.findOne({
        $or: [
          { slug: category },
          { _id: category }
        ]
      });
      
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      } else {
        // If category not found, return empty results
        return res.json({
          success: true,
          data: {
            rooms: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalCount: 0,
              hasNextPage: false,
              hasPrevPage: false
            }
          }
        });
      }
    }
    
    // Price filtering (using virtual currentPrice would require aggregation)
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }

    // If dates are provided, find available rooms
    let roomQuery;
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (checkInDate >= checkOutDate) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }
      
      roomQuery = Room.findAvailable(checkInDate, checkOutDate, guests ? parseInt(guests) : 1);
    } else {
      roomQuery = Room.find(filter);
    }

    // Apply sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [rooms, totalCount] = await Promise.all([
      roomQuery
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      
      checkIn && checkOut ? 
        Room.findAvailable(new Date(checkIn), new Date(checkOut), guests ? parseInt(guests) : 1).countDocuments() :
        Room.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rooms'
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room || !room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    });
  }
});

// @route   GET /api/rooms/slug/:slug
// @desc    Get single room by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const room = await Room.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    });
  }
});

// @route   POST /api/rooms/:id/availability
// @desc    Check room availability for specific dates
// @access  Public
router.post('/:id/availability', [
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('guests').optional().isInt({ min: 1 }).withMessage('Number of guests must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { checkIn, checkOut, guests = 1 } = req.body;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }
    
    if (checkInDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    const room = await Room.findById(req.params.id);
    
    if (!room || !room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    if (room.maxOccupancy < guests) {
      return res.status(400).json({
        success: false,
        message: `Room can accommodate maximum ${room.maxOccupancy} guests`
      });
    }

    const isAvailable = await room.isAvailable(checkInDate, checkOutDate);
    
    // Calculate pricing
    const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const roomRate = room.currentPrice;
    const subtotal = roomRate * numberOfNights;
    const taxes = subtotal * 0.12; // 12% tax
    const total = subtotal + taxes;

    res.json({
      success: true,
      data: {
        available: isAvailable,
        room: {
          id: room._id,
          name: room.name,
          type: room.type,
          maxOccupancy: room.maxOccupancy
        },
        pricing: {
          roomRate,
          numberOfNights,
          subtotal,
          taxes,
          total
        },
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate
        }
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking availability'
    });
  }
});

// @route   GET /api/rooms/types/available
// @desc    Get available room types with counts
// @access  Public
router.get('/types/available', [
  query('checkIn').optional().isISO8601(),
  query('checkOut').optional().isISO8601(),
  query('guests').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const { checkIn, checkOut, guests = 1 } = req.query;
    
    let aggregationPipeline = [
      {
        $match: {
          isActive: true,
          status: 'Available',
          maxOccupancy: { $gte: parseInt(guests) }
        }
      }
    ];
    
    // If dates provided, filter by availability
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      aggregationPipeline.push(
        {
          $lookup: {
            from: 'bookings',
            let: { roomId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$room', '$$roomId'] },
                  status: { $in: ['Confirmed', 'Checked In'] },
                  $or: [
                    {
                      checkInDate: { $lt: checkOutDate },
                      checkOutDate: { $gt: checkInDate }
                    }
                  ]
                }
              }
            ],
            as: 'conflictingBookings'
          }
        },
        {
          $match: {
            conflictingBookings: { $size: 0 }
          }
        }
      );
    }
    
    aggregationPipeline.push(
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' },
          avgPrice: { $avg: '$basePrice' },
          rooms: {
            $push: {
              id: '$_id',
              name: '$name',
              price: '$basePrice',
              amenities: '$amenities',
              images: { $slice: ['$images', 1] }
            }
          }
        }
      },
      {
        $sort: { minPrice: 1 }
      }
    );
    
    const roomTypes = await Room.aggregate(aggregationPipeline);
    
    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Error fetching room types:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room types'
    });
  }
});

// Protected routes below (require authentication)

// @route   POST /api/rooms
// @desc    Create a new room (Admin only)
// @access  Private/Admin
router.post('/', adminAuth, [
  body('name').notEmpty().withMessage('Room name is required'),
  body('type').isIn(['Standard', 'Deluxe', 'Suite', 'Executive Suite', 'Presidential Suite']),
  body('description').notEmpty().withMessage('Description is required'),
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('floor').isInt({ min: 1 }).withMessage('Floor must be a positive integer'),
  body('size').isFloat({ min: 1 }).withMessage('Size must be a positive number'),
  body('maxOccupancy').isInt({ min: 1, max: 8 }).withMessage('Max occupancy must be between 1 and 8'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('bedType').isIn(['Single', 'Double', 'Queen', 'King', 'Twin', 'Sofa Bed']),
  body('bedCount').isInt({ min: 1 }).withMessage('Bed count must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber: req.body.roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists'
      });
    }

    const room = new Room(req.body);
    await room.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating room'
    });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update room (Admin only)
// @access  Private/Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating room'
    });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete room (Admin only)
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room'
    });
  }
});

module.exports = router;