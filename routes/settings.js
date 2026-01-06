const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/settings
// @desc    Get site settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings'
    });
  }
});

// @route   PUT /api/settings
// @desc    Update site settings
// @access  Private (Admin)
router.put('/', adminAuth, async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = new SiteSettings(req.body);
    } else {
      // Update all provided fields
      Object.keys(req.body).forEach(key => {
        if (key !== '_id' && key !== '__v') {
          if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key]) && req.body[key] !== null) {
            // Deep merge for nested objects
            settings[key] = { ...settings[key], ...req.body[key] };
          } else {
            settings[key] = req.body[key];
          }
        }
      });
    }

    if (req.admin && req.admin.id) {
      settings.lastModifiedBy = req.admin.id;
    }
    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings'
    });
  }
});

// @route   GET /api/settings/public
// @desc    Get public settings (subset for frontend)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    // Return only public-facing settings
    const publicSettings = {
      hotel: {
        name: settings.hotel.name,
        tagline: settings.hotel.tagline,
        phone: settings.hotel.phone,
        email: settings.hotel.email,
        whatsapp: settings.hotel.whatsapp,
        address: settings.hotel.address,
        socialMedia: settings.hotel.socialMedia,
        businessHours: settings.hotel.businessHours
      },
      theme: settings.theme,
      features: settings.features,
      languages: settings.languages,
      booking: {
        enabled: settings.booking.enabled,
        minNights: settings.booking.minNights,
        maxNights: settings.booking.maxNights,
        currency: settings.booking.currency,
        currencySymbol: settings.booking.currencySymbol
      }
    };

    res.json({
      success: true,
      data: { settings: publicSettings }
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings'
    });
  }
});

// @route   PUT /api/settings/hotel
// @desc    Update hotel information
// @access  Private (Admin)
router.put('/hotel', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    settings.hotel = { ...settings.hotel, ...req.body };
    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Hotel information updated successfully',
      data: { hotel: settings.hotel }
    });
  } catch (error) {
    console.error('Update hotel info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hotel information'
    });
  }
});

// @route   PUT /api/settings/theme
// @desc    Update theme settings
// @access  Private (Admin)
router.put('/theme', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    settings.theme = { ...settings.theme, ...req.body };
    if (req.body.colors) {
      settings.theme.colors = { ...settings.theme.colors, ...req.body.colors };
    }
    if (req.body.fonts) {
      settings.theme.fonts = { ...settings.theme.fonts, ...req.body.fonts };
    }
    if (req.body.layout) {
      settings.theme.layout = { ...settings.theme.layout, ...req.body.layout };
    }

    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Theme updated successfully',
      data: { theme: settings.theme }
    });
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating theme'
    });
  }
});

// @route   PUT /api/settings/maintenance
// @desc    Toggle maintenance mode
// @access  Private (Admin)
router.put('/maintenance', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();
    const { enabled, message, allowedIPs } = req.body;

    if (typeof enabled !== 'undefined') {
      settings.maintenance.enabled = enabled;
    }
    if (message) {
      settings.maintenance.message = message;
    }
    if (allowedIPs) {
      settings.maintenance.allowedIPs = allowedIPs;
    }

    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Maintenance mode updated successfully',
      data: { maintenance: settings.maintenance }
    });
  } catch (error) {
    console.error('Update maintenance mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating maintenance mode'
    });
  }
});

module.exports = router;

