const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

// @route   POST /api/contact
// @desc    Send contact form message
// @access  Public
router.post('/', [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('subject').optional().trim(),
  body('message').notEmpty().withMessage('Message is required').isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters')
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

    const { name, email, phone, subject, message } = req.body;

    // Log the contact form submission
    logger.info('Contact form submission received', {
      name,
      email,
      subject: subject || 'General Inquiry',
      ip: req.ip
    });

    // Send email to hotel management
    try {
      await sendEmail({
        to: process.env.HOTEL_EMAIL || 'info@oldvinehotel.com',
        subject: `Contact Form: ${subject || 'General Inquiry'}`,
        template: 'contactForm',
        context: {
          name,
          email,
          phone,
          message,
          timestamp: new Date().toLocaleString()
        }
      });

      logger.info('Contact form email sent successfully', { name, email });
    } catch (emailError) {
      logger.error('Failed to send contact form email:', emailError);
      // Don't fail the request if email fails
    }

    // Send auto-reply to customer
    try {
      await sendEmail({
        to: email,
        subject: 'Thank you for contacting The Old Vine Hotel',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: #8B4513; color: white; padding: 20px; text-align: center;">
              <h1>The Old Vine Hotel</h1>
            </div>
            
            <div style="padding: 20px;">
              <p>Dear ${name},</p>
              
              <p>Thank you for contacting The Old Vine Hotel. We have received your message and will respond within 24 hours.</p>
              
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Message:</h3>
                <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                <p><strong>Message:</strong> ${message}</p>
              </div>
              
              <p>In the meantime, feel free to:</p>
              <ul>
                <li>Browse our rooms and amenities on our website</li>
                <li>Call us directly at +1 (555) 123-4567</li>
                <li>Follow us on social media for updates and special offers</li>
              </ul>
              
              <p>We look forward to serving you!</p>
              
              <p>Best regards,<br>
              The Old Vine Hotel Team</p>
            </div>
            
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2025 The Old Vine Hotel. All rights reserved.</p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      logger.error('Failed to send contact form auto-reply:', emailError);
    }

    res.json({
      success: true,
      message: 'Thank you for your message. We will get back to you within 24 hours.'
    });
  } catch (error) {
    logger.error('Contact form processing error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message. Please try again.'
    });
  }
});

// @route   POST /api/contact/newsletter
// @desc    Subscribe to newsletter
// @access  Public
router.post('/newsletter', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('name').optional().trim()
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

    const { email, name } = req.body;

    // Log newsletter subscription
    logger.info('Newsletter subscription', {
      email,
      name: name || 'Not provided',
      ip: req.ip
    });

    // In a real application, you would save this to a newsletter database
    // For now, we'll just send a confirmation email

    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to The Old Vine Hotel Newsletter',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: #8B4513; color: white; padding: 20px; text-align: center;">
              <h1>The Old Vine Hotel</h1>
              <h2>Newsletter Subscription Confirmed</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Dear ${name || 'Valued Guest'},</p>
              
              <p>Thank you for subscribing to The Old Vine Hotel newsletter!</p>
              
              <p>You'll now receive:</p>
              <ul>
                <li>Exclusive special offers and promotions</li>
                <li>Updates on hotel amenities and services</li>
                <li>Local event recommendations</li>
                <li>Seasonal packages and deals</li>
              </ul>
              
              <p>We're excited to keep you informed about everything happening at The Old Vine Hotel.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://oldvinehotel.com" style="background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Our Website</a>
              </div>
              
              <p>Best regards,<br>
              The Old Vine Hotel Team</p>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                You can unsubscribe from these emails at any time by clicking the unsubscribe link in any newsletter.
              </p>
            </div>
            
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2025 The Old Vine Hotel. All rights reserved.</p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      logger.error('Failed to send newsletter confirmation:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Thank you for subscribing! You will receive a confirmation email shortly.'
    });
  } catch (error) {
    logger.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your subscription. Please try again.'
    });
  }
});

// @route   GET /api/contact/info
// @desc    Get hotel contact information
// @access  Public
router.get('/info', (req, res) => {
  const contactInfo = {
    hotel: {
      name: process.env.HOTEL_NAME || 'The Old Vine Hotel',
      address: {
        street: 'Old Damascus City',
        city: 'Damascus',
        state: 'Damascus Governorate',
        zipCode: '',
        country: 'Syria',
        formatted: process.env.HOTEL_ADDRESS || 'Old Damascus City'
      },
      phone: process.env.HOTEL_PHONE || '+963 986 703 070',
      email: process.env.HOTEL_EMAIL || 'info@oldvinehotel.com',
      website: process.env.HOTEL_WEBSITE || 'https://oldvinehotel.com',
      whatsapp: process.env.WHATSAPP_PHONE_NUMBER || '+963 986 703 070'
    },
    departments: {
      reservations: {
        phone: '+963 986 703 070',
        email: 'reservations@oldvinehotel.com',
        hours: '24/7'
      },
      concierge: {
        phone: '+963 986 703 070',
        email: 'concierge@oldvinehotel.com',
        hours: '6:00 AM - 12:00 AM'
      },
      restaurant: {
        phone: '+963 986 703 070',
        email: 'restaurant@oldvinehotel.com',
        hours: '6:30 AM - 11:00 PM'
      },
      spa: {
        phone: '+963 986 703 070',
        email: 'spa@oldvinehotel.com',
        hours: '8:00 AM - 9:00 PM'
      },
      events: {
        phone: '+963 986 703 070',
        email: 'events@oldvinehotel.com',
        hours: '9:00 AM - 6:00 PM'
      }
    },
    socialMedia: {
      facebook: 'https://facebook.com/oldvinehotel',
      instagram: 'https://instagram.com/oldvinehotel',
      twitter: 'https://twitter.com/oldvinehotel',
      linkedin: 'https://linkedin.com/company/oldvinehotel'
    },
    checkInOut: {
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      earlyCheckIn: 'Available upon request (additional fee may apply)',
      lateCheckOut: 'Available upon request (additional fee may apply)'
    },
    policies: {
      cancellation: '24 hours before arrival',
      petPolicy: 'Pets allowed with prior arrangement',
      smokingPolicy: 'Non-smoking hotel',
      childrenPolicy: 'Children of all ages welcome'
    }
  };

  res.json({
    success: true,
    data: contactInfo
  });
});

module.exports = router;