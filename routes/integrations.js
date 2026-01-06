const express = require('express');
const router = express.Router();
const OperaPMSService = require('../services/OperaPMSService');
const BookingComService = require('../services/BookingComService');
const TripComService = require('../services/TripComService');
const ExpediaService = require('../services/ExpediaService');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../utils/logger');

// Initialize services
const operaPMS = new OperaPMSService();
const bookingCom = new BookingComService();
const tripCom = new TripComService();
const expedia = new ExpediaService();

// @route   GET /api/integrations/health
// @desc    Check health of all integrations
// @access  Private/Admin
router.get('/health', adminAuth, async (req, res) => {
  try {
    const healthChecks = await Promise.allSettled([
      operaPMS.healthCheck(),
      bookingCom.healthCheck(),
      tripCom.healthCheck(),
      expedia.healthCheck()
    ]);

    const results = {
      operaPMS: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error', error: healthChecks[0].reason.message },
      bookingCom: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error', error: healthChecks[1].reason.message },
      tripCom: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error', error: healthChecks[2].reason.message },
      expedia: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'error', error: healthChecks[3].reason.message }
    };

    const overallStatus = Object.values(results).every(result => result.status === 'connected') ? 'healthy' : 'partial';

    res.json({
      success: true,
      data: {
        overallStatus,
        services: results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Integration health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check integration health'
    });
  }
});

// @route   POST /api/integrations/opera/sync-rooms
// @desc    Sync room inventory with Opera PMS
// @access  Private/Admin
router.post('/opera/sync-rooms', adminAuth, async (req, res) => {
  try {
    const result = await operaPMS.syncRoomInventory();
    
    logger.integrationLog('Room inventory sync completed', {
      admin: req.admin.email,
      result
    });

    res.json({
      success: true,
      message: 'Room inventory synchronized successfully',
      data: result
    });
  } catch (error) {
    logger.error('Room inventory sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync room inventory'
    });
  }
});

// @route   POST /api/integrations/opera/create-reservation
// @desc    Create reservation in Opera PMS
// @access  Private (called internally)
router.post('/opera/create-reservation', async (req, res) => {
  try {
    const { booking } = req.body;
    const result = await operaPMS.createReservation(booking);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Opera PMS reservation creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reservation in Opera PMS'
    });
  }
});

// @route   POST /api/integrations/sync-rates
// @desc    Sync rates across all platforms
// @access  Private/Admin
router.post('/sync-rates', adminAuth, async (req, res) => {
  try {
    const { roomType, rates, dates } = req.body;

    // Sync rates to all platforms
    const syncPromises = [
      bookingCom.updateRates(roomType, rates, dates),
      tripCom.updateRates(roomType, rates, dates),
      expedia.updateRates(roomType, rates, dates)
    ];

    const results = await Promise.allSettled(syncPromises);

    const syncResults = {
      bookingCom: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason.message },
      tripCom: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason.message },
      expedia: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason.message }
    };

    logger.integrationLog('Rate sync completed', {
      admin: req.admin.email,
      roomType,
      dates,
      results: syncResults
    });

    res.json({
      success: true,
      message: 'Rates synchronized across platforms',
      data: syncResults
    });
  } catch (error) {
    logger.error('Rate sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync rates'
    });
  }
});

// @route   POST /api/integrations/sync-availability
// @desc    Sync availability across all platforms
// @access  Private/Admin
router.post('/sync-availability', adminAuth, async (req, res) => {
  try {
    const { roomType, availability, dates } = req.body;

    // Sync availability to all platforms
    const syncPromises = [
      bookingCom.updateAvailability(roomType, availability, dates),
      tripCom.updateAvailability(roomType, availability, dates),
      expedia.updateAvailability(roomType, availability, dates)
    ];

    const results = await Promise.allSettled(syncPromises);

    const syncResults = {
      bookingCom: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason.message },
      tripCom: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason.message },
      expedia: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason.message }
    };

    logger.integrationLog('Availability sync completed', {
      admin: req.admin.email,
      roomType,
      dates,
      results: syncResults
    });

    res.json({
      success: true,
      message: 'Availability synchronized across platforms',
      data: syncResults
    });
  } catch (error) {
    logger.error('Availability sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync availability'
    });
  }
});

// @route   GET /api/integrations/bookings/external
// @desc    Get bookings from external platforms
// @access  Private/Admin
router.get('/bookings/external', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(endDate || Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Fetch bookings from all platforms
    const bookingPromises = [
      bookingCom.getBookings(start, end),
      tripCom.getBookings(start, end),
      expedia.getBookings(start, end)
    ];

    const results = await Promise.allSettled(bookingPromises);

    const externalBookings = {
      bookingCom: results[0].status === 'fulfilled' ? results[0].value : [],
      tripCom: results[1].status === 'fulfilled' ? results[1].value : [],
      expedia: results[2].status === 'fulfilled' ? results[2].value : []
    };

    // Combine all bookings
    const allBookings = [
      ...externalBookings.bookingCom.map(b => ({ ...b, source: 'Booking.com' })),
      ...externalBookings.tripCom.map(b => ({ ...b, source: 'Trip.com' })),
      ...externalBookings.expedia.map(b => ({ ...b, source: 'Expedia' }))
    ];

    res.json({
      success: true,
      data: {
        bookings: allBookings,
        summary: {
          total: allBookings.length,
          byPlatform: {
            bookingCom: externalBookings.bookingCom.length,
            tripCom: externalBookings.tripCom.length,
            expedia: externalBookings.expedia.length
          }
        }
      }
    });
  } catch (error) {
    logger.error('External bookings fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch external bookings'
    });
  }
});

// @route   POST /api/integrations/webhook/booking-com
// @desc    Handle Booking.com webhooks
// @access  Public (webhook)
router.post('/webhook/booking-com', async (req, res) => {
  try {
    const webhookData = req.body;
    
    logger.integrationLog('Booking.com webhook received', {
      type: webhookData.event_type,
      bookingId: webhookData.booking_id
    });

    // Process webhook based on event type
    switch (webhookData.event_type) {
      case 'booking_created':
        await bookingCom.processNewBooking(webhookData);
        break;
      case 'booking_modified':
        await bookingCom.processBookingModification(webhookData);
        break;
      case 'booking_cancelled':
        await bookingCom.processBookingCancellation(webhookData);
        break;
      default:
        logger.integrationLog('Unknown Booking.com webhook event', {
          type: webhookData.event_type
        });
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Booking.com webhook processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// @route   POST /api/integrations/webhook/expedia
// @desc    Handle Expedia webhooks
// @access  Public (webhook)
router.post('/webhook/expedia', async (req, res) => {
  try {
    const webhookData = req.body;
    
    logger.integrationLog('Expedia webhook received', {
      type: webhookData.event_type,
      bookingId: webhookData.booking_id
    });

    // Process Expedia webhook
    await expedia.processWebhook(webhookData);

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Expedia webhook processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// @route   GET /api/integrations/analytics/platform-performance
// @desc    Get performance analytics for all platforms
// @access  Private/Admin
router.get('/analytics/platform-performance', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(endDate || Date.now());

    // Get performance data from all platforms
    const performancePromises = [
      bookingCom.getPerformanceData(start, end),
      tripCom.getPerformanceData(start, end),
      expedia.getPerformanceData(start, end)
    ];

    const results = await Promise.allSettled(performancePromises);

    const performanceData = {
      bookingCom: results[0].status === 'fulfilled' ? results[0].value : null,
      tripCom: results[1].status === 'fulfilled' ? results[1].value : null,
      expedia: results[2].status === 'fulfilled' ? results[2].value : null
    };

    res.json({
      success: true,
      data: {
        dateRange: { start, end },
        platforms: performanceData
      }
    });
  } catch (error) {
    logger.error('Platform performance analytics failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform performance data'
    });
  }
});

module.exports = router;