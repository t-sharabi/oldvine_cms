// cms/routes/settings.js
const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const adminAuth = require('../middleware/adminAuth');

const normalizeAddress = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.join(', ');

  if (typeof val === 'object') {
    if (typeof val.text === 'string') return val.text;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.address === 'string') return val.address;

    // {coordinates:[lng,lat]}
    if (Array.isArray(val.coordinates) && val.coordinates.length >= 2) {
      const [lng, lat] = val.coordinates;
      if (lat != null && lng != null) return `${lat}, ${lng}`;
    }
    // {coordinates:{lat,lng}}
    if (val.coordinates && typeof val.coordinates === 'object') {
      const lat = val.coordinates.lat ?? val.coordinates.latitude;
      const lng = val.coordinates.lng ?? val.coordinates.lon ?? val.coordinates.longitude;
      if (lat != null && lng != null) return `${lat}, ${lng}`;
    }
  }
  return '';
};

// @route   GET /api/settings
// @desc    Get site settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();
    res.json({ success: true, data: { settings } });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
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
      Object.keys(req.body).forEach((key) => {
        if (key !== '_id' && key !== '__v') {
          if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key]) && req.body[key] !== null) {
            settings[key] = { ...settings[key], ...req.body[key] };
          } else {
            settings[key] = req.body[key];
          }
        }
      });
    }

    if (req.admin && req.admin.id) settings.lastModifiedBy = req.admin.id;

    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// @route   GET /api/settings/public
// @desc    Get public settings (subset for frontend)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    const addressText = normalizeAddress(settings.hotel.address || settings.hotel.location);

    const publicSettings = {
      hotel: {
        name: settings.hotel.name,
        tagline: settings.hotel.tagline,
        phone: settings.hotel.phone,
        email: settings.hotel.email,
        whatsapp: settings.hotel.whatsapp,
        address: addressText, 
        socialMedia: settings.hotel.socialMedia,
        businessHours: settings.hotel.businessHours,
      },
      theme: settings.theme,
      features: settings.features,
      languages: settings.languages,
      booking: {
        enabled: settings.booking.enabled,
        minNights: settings.booking.minNights,
        maxNights: settings.booking.maxNights,
        currency: settings.booking.currency,
        currencySymbol: settings.booking.currencySymbol,
      },
    };

    res.json({ success: true, data: { settings: publicSettings } });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

router.put('/hotel', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();
    settings.hotel = { ...settings.hotel, ...req.body };
    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Hotel information updated successfully',
      data: { hotel: settings.hotel },
    });
  } catch (error) {
    console.error('Update hotel info error:', error);
    res.status(500).json({ success: false, message: 'Error updating hotel information' });
  }
});

router.put('/theme', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();

    settings.theme = { ...settings.theme, ...req.body };
    if (req.body.colors) settings.theme.colors = { ...settings.theme.colors, ...req.body.colors };
    if (req.body.fonts) settings.theme.fonts = { ...settings.theme.fonts, ...req.body.fonts };
    if (req.body.layout) settings.theme.layout = { ...settings.theme.layout, ...req.body.layout };

    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Theme updated successfully',
      data: { theme: settings.theme },
    });
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ success: false, message: 'Error updating theme' });
  }
});

router.put('/maintenance', adminAuth, async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings();
    const { enabled, message, allowedIPs } = req.body;

    if (typeof enabled !== 'undefined') settings.maintenance.enabled = enabled;
    if (message) settings.maintenance.message = message;
    if (allowedIPs) settings.maintenance.allowedIPs = allowedIPs;

    settings.lastModifiedBy = req.admin.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Maintenance mode updated successfully',
      data: { maintenance: settings.maintenance },
    });
  } catch (error) {
    console.error('Update maintenance mode error:', error);
    res.status(500).json({ success: false, message: 'Error updating maintenance mode' });
  }
});

module.exports = router;
