const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');


// @route   POST /api/bookings/request
// @desc    Create a booking request (no online payment)
// @access  Public
router.post('/request', [
  body('guestInfo.firstName').notEmpty().withMessage('First name is required'),
  body('guestInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('guestInfo.email').isEmail().withMessage('Valid email is required'),
  body('guestInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('roomId').isMongoId().withMessage('Valid room ID is required'),
  body('checkInDate').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOutDate').isISO8601().withMessage('Valid check-out date is required'),
  body('numberOfGuests.adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
  body('numberOfGuests.children').optional().isInt({ min: 0 }),
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

    const { guestInfo, roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = req.body;

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkIn >= checkOut) {
      return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date' });
    }
    if (checkIn < new Date()) {
      return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past' });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const totalGuests = Number(numberOfGuests.adults) + Number(numberOfGuests.children || 0);
    if (room.maxOccupancy < totalGuests) {
      return res.status(400).json({
        success: false,
        message: `Room can accommodate maximum ${room.maxOccupancy} guests`
      });
    }

    const isAvailable = await room.isAvailable(checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Find or create guest
    let guest = await Guest.findOne({ email: guestInfo.email });
    if (!guest) {
      guest = new Guest({ ...guestInfo, isRegistered: false });
      await guest.save();
    } else {
      Object.assign(guest, guestInfo);
      await guest.save();
    }

    // Pricing
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const roomRate = room.currentPrice;
    const subtotal = roomRate * numberOfNights;
    const taxes = subtotal * 0.12;
    const totalAmount = subtotal + taxes;

    const booking = new Booking({
      guest: guest._id,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests,
      roomRate,
      numberOfNights,
      subtotal,
      taxes,
      totalAmount,
      specialRequests,
      paymentStatus: 'Pending',
      paymentMethod: 'Cash',
      status: 'Pending',
      bookingSource: 'Direct'
    });

    await booking.save();
    await booking.populate(['guest', 'room']);

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: { booking }
    });
  } catch (error) {
    logger.error('Error creating booking request:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating booking request' });
  }
});


// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Public
router.post('/', [
  body('guestInfo.firstName').notEmpty().withMessage('First name is required'),
  body('guestInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('guestInfo.email').isEmail().withMessage('Valid email is required'),
  body('guestInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('roomId').isMongoId().withMessage('Valid room ID is required'),
  body('checkInDate').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOutDate').isISO8601().withMessage('Valid check-out date is required'),
  body('numberOfGuests.adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
  body('numberOfGuests.children').optional().isInt({ min: 0 }),
  body('paymentMethodId').notEmpty().withMessage('Payment method is required')
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
      guestInfo,
      roomId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      specialRequests,
      paymentMethodId
    } = req.body;

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    // Validate dates
    if (checkIn >= checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }
    
    if (checkIn < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    // Check room availability
    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const totalGuests = numberOfGuests.adults + (numberOfGuests.children || 0);
    if (room.maxOccupancy < totalGuests) {
      return res.status(400).json({
        success: false,
        message: `Room can accommodate maximum ${room.maxOccupancy} guests`
      });
    }

    const isAvailable = await room.isAvailable(checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Find or create guest
    let guest = await Guest.findOne({ email: guestInfo.email });
    if (!guest) {
      guest = new Guest({
        ...guestInfo,
        isRegistered: false
      });
      await guest.save();
    } else {
      // Update guest information if provided
      Object.assign(guest, guestInfo);
      await guest.save();
    }

    // Calculate pricing
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const roomRate = room.currentPrice;
    const subtotal = roomRate * numberOfNights;
    const taxes = subtotal * 0.12; // 12% tax
    const totalAmount = subtotal + taxes;

    // Create Stripe payment intent
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe uses cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          roomId: roomId,
          guestEmail: guestInfo.email,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate
        }
      });
    } catch (stripeError) {
      logger.error('Stripe payment error:', stripeError);
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: stripeError.message
      });
    }

    // Create booking
    const booking = new Booking({
      guest: guest._id,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests,
      roomRate,
      numberOfNights,
      subtotal,
      taxes,
      totalAmount,
      specialRequests,
      paymentStatus: paymentIntent.status === 'succeeded' ? 'Paid' : 'Pending',
      paymentMethod: 'Credit Card',
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'Confirmed' : 'Pending',
      bookingSource: 'Direct'
    });

    await booking.save();
    await booking.populate(['guest', 'room']);

    // Update guest statistics if payment successful
    if (paymentIntent.status === 'succeeded') {
      await guest.updateStayStats(totalAmount);
      await guest.addLoyaltyPoints(Math.floor(totalAmount / 10)); // 1 point per $10
    }

    // Send confirmation email
    if (paymentIntent.status === 'succeeded') {
      try {
        await sendEmail({
          to: guest.email,
          subject: 'Booking Confirmation - The Old Vine Hotel',
          template: 'bookingConfirmation',
          context: {
            guest: guest,
            booking: booking,
            room: room
          }
        });
        
        booking.emailConfirmationSent = true;
        await booking.save();
      } catch (emailError) {
        logger.error('Email sending error:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: paymentIntent.status === 'succeeded' 
        ? 'Booking confirmed successfully' 
        : 'Booking created, payment processing',
      data: {
        booking,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret
        }
      }
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// @route   GET /api/bookings/:bookingNumber
// @desc    Get booking by booking number
// @access  Public (with confirmation code) / Private
router.get('/:bookingNumber', async (req, res) => {
  try {
    const { bookingNumber } = req.params;
    const { confirmationCode } = req.query;

    let booking;
    
    // If confirmation code provided, allow public access
    if (confirmationCode) {
      booking = await Booking.findOne({
        bookingNumber,
        confirmationCode
      }).populate(['guest', 'room']);
    } else {
      // Otherwise require authentication (implement auth middleware check here)
      booking = await Booking.findOne({ bookingNumber })
        .populate(['guest', 'room']);
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// @route   PUT /api/bookings/:bookingNumber/cancel
// @desc    Cancel a booking
// @access  Public (with confirmation code)
router.put('/:bookingNumber/cancel', [
  body('confirmationCode').notEmpty().withMessage('Confirmation code is required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
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

    const { bookingNumber } = req.params;
    const { confirmationCode, reason } = req.body;

    const booking = await Booking.findOne({
      bookingNumber,
      confirmationCode
    }).populate(['guest', 'room']);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled at this time'
      });
    }

    // Calculate cancellation fee
    const cancellationFee = booking.calculateCancellationFee();
    const refundAmount = booking.totalAmount - cancellationFee;

    // Process refund with Stripe
    if (booking.stripePaymentIntentId && refundAmount > 0) {
      try {
        await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Stripe uses cents
          metadata: {
            bookingNumber: bookingNumber,
            reason: reason || 'Guest cancellation'
          }
        });
      } catch (stripeError) {
        logger.error('Stripe refund error:', stripeError);
        return res.status(400).json({
          success: false,
          message: 'Refund processing failed'
        });
      }
    }

    // Update booking
    booking.status = 'Cancelled';
    booking.cancellationReason = reason;
    booking.cancellationDate = new Date();
    booking.cancellationFee = cancellationFee;
    booking.refundAmount = refundAmount;
    booking.paymentStatus = refundAmount > 0 ? 'Refunded' : 'Paid';

    await booking.save();

    // Send cancellation email
    try {
      await sendEmail({
        to: booking.guest.email,
        subject: 'Booking Cancellation - The Old Vine Hotel',
        template: 'bookingCancellation',
        context: {
          guest: booking.guest,
          booking: booking,
          room: booking.room,
          cancellationFee,
          refundAmount
        }
      });
    } catch (emailError) {
      logger.error('Cancellation email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingNumber,
        cancellationFee,
        refundAmount,
        status: booking.status
      }
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
});

// @route   GET /api/bookings
// @desc    Get all bookings (Admin only)
// @access  Private/Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      checkInDate,
      checkOutDate,
      guestEmail,
      roomType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    let filter = {};
    
    if (status) filter.status = status;
    if (guestEmail) {
      const guest = await Guest.findOne({ email: guestEmail });
      if (guest) filter.guest = guest._id;
    }
    
    if (checkInDate || checkOutDate) {
      filter.checkInDate = {};
      if (checkInDate) filter.checkInDate.$gte = new Date(checkInDate);
      if (checkOutDate) filter.checkInDate.$lte = new Date(checkOutDate);
    }

    // Build aggregation pipeline for room type filter
    let aggregationPipeline = [{ $match: filter }];
    
    if (roomType) {
      aggregationPipeline.push(
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomData'
          }
        },
        {
          $match: {
            'roomData.type': roomType
          }
        }
      );
    }

    // Add pagination and sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    aggregationPipeline.push(
      { $sort: sortOptions },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'guests',
          localField: 'guest',
          foreignField: '_id',
          as: 'guest'
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'room'
        }
      },
      {
        $unwind: '$guest'
      },
      {
        $unwind: '$room'
      }
    );

    const [bookings, totalCount] = await Promise.all([
      Booking.aggregate(aggregationPipeline),
      Booking.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        bookings,
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
    logger.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// @route   PUT /api/bookings/:id/checkin
// @desc    Check in a guest (Admin only)
// @access  Private/Admin
router.put('/:id/checkin', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['guest', 'room']);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed to check in'
      });
    }

    // Update booking status
    booking.status = 'Checked In';
    booking.actualCheckInTime = new Date();
    await booking.save();

    // Update room status
    const room = await Room.findById(booking.room._id);
    room.status = 'Occupied';
    await room.save();

    res.json({
      success: true,
      message: 'Guest checked in successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error checking in guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   PUT /api/bookings/:id/checkout
// @desc    Check out a guest (Admin only)
// @access  Private/Admin
router.put('/:id/checkout', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['guest', 'room']);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'Checked In') {
      return res.status(400).json({
        success: false,
        message: 'Guest must be checked in to check out'
      });
    }

    // Update booking status
    booking.status = 'Checked Out';
    booking.actualCheckOutTime = new Date();
    await booking.save();

    // Update room status
    const room = await Room.findById(booking.room._id);
    room.status = 'Available';
    room.cleaningStatus = 'Dirty';
    room.lastCleaning = new Date();
    await room.save();

    res.json({
      success: true,
      message: 'Guest checked out successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error checking out guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-out'
    });
  }
});

// @route   GET /api/bookings/analytics/revenue
// @desc    Get revenue analytics (Admin only)
// @access  Private/Admin
router.get('/analytics/revenue', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueData = await Booking.generateRevenueReport(start, end);
    
    // Calculate total metrics
    const totalRevenue = revenueData.reduce((sum, day) => sum + day.totalRevenue, 0);
    const totalBookings = revenueData.reduce((sum, day) => sum + day.bookingsCount, 0);
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    res.json({
      success: true,
      data: {
        revenueData,
        summary: {
          totalRevenue,
          totalBookings,
          averageBookingValue,
          dateRange: { start, end }
        }
      }
    });
  } catch (error) {
    logger.error('Error generating revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating analytics'
    });
  }
});

module.exports = router;