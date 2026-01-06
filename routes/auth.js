const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Guest = require('../models/Guest');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new guest
// @access  Public
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required').trim(),
  body('lastName').notEmpty().withMessage('Last name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return value;
  })
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

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if guest already exists
    let guest = await Guest.findOne({ email });
    if (guest && guest.isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Guest already registered with this email'
      });
    }

    // Create or update guest
    if (guest) {
      // Update existing guest profile
      guest.firstName = firstName;
      guest.lastName = lastName;
      guest.phone = phone;
      guest.password = password;
      guest.isRegistered = true;
      guest.emailVerified = false;
    } else {
      // Create new guest
      guest = new Guest({
        firstName,
        lastName,
        email,
        phone,
        password,
        isRegistered: true,
        emailVerified: false
      });
    }

    await guest.save();

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    guest.emailVerificationToken = verificationToken;
    await guest.save();

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - The Old Vine Hotel',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: #8B4513; color: white; padding: 20px; text-align: center;">
              <h1>The Old Vine Hotel</h1>
              <h2>Email Verification</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Dear ${firstName} ${lastName},</p>
              
              <p>Thank you for registering with The Old Vine Hotel! Please verify your email address to complete your registration.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/verify-email?token=${verificationToken}" 
                   style="background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${process.env.CLIENT_URL}/verify-email?token=${verificationToken}</p>
              
              <p>This verification link will expire in 24 hours.</p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
              
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
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT token
    const token = generateToken({
      id: guest._id,
      email: guest.email,
      isAdmin: false
    });

    logger.info('Guest registered successfully', {
      guestId: guest._id,
      email: guest.email
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        token,
        guest: {
          id: guest._id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          emailVerified: guest.emailVerified,
          loyaltyProgram: guest.loyaltyProgram
        }
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login guest
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
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

    const { email, password } = req.body;

    // Find guest with password field
    const guest = await Guest.findOne({ email, isRegistered: true }).select('+password');
    
    if (!guest) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!guest.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await guest.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    guest.lastLogin = new Date();
    guest.lastActivity = new Date();
    await guest.save();

    // Generate JWT token
    const token = generateToken({
      id: guest._id,
      email: guest.email,
      isAdmin: false
    });

    logger.info('Guest login successful', {
      guestId: guest._id,
      email: guest.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        guest: {
          id: guest._id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          emailVerified: guest.emailVerified,
          loyaltyProgram: guest.loyaltyProgram,
          preferences: guest.preferences,
          isVIP: guest.isVIP
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current guest
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Update last activity
    req.guest.lastActivity = new Date();
    await req.guest.save();

    res.json({
      success: true,
      data: {
        guest: {
          id: req.guest._id,
          firstName: req.guest.firstName,
          lastName: req.guest.lastName,
          email: req.guest.email,
          phone: req.guest.phone,
          emailVerified: req.guest.emailVerified,
          loyaltyProgram: req.guest.loyaltyProgram,
          preferences: req.guest.preferences,
          isVIP: req.guest.isVIP,
          totalStays: req.guest.totalStays,
          totalSpent: req.guest.totalSpent
        }
      }
    });
  } catch (error) {
    logger.error('Get current guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
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

    const { email } = req.body;

    const guest = await Guest.findOne({ email, isRegistered: true });
    if (!guest) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = guest.createPasswordResetToken();
    await guest.save();

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - The Old Vine Hotel',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: #8B4513; color: white; padding: 20px; text-align: center;">
              <h1>The Old Vine Hotel</h1>
              <h2>Password Reset</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Dear ${guest.firstName} ${guest.lastName},</p>
              
              <p>You have requested to reset your password. Click the button below to reset it:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" 
                   style="background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${process.env.CLIENT_URL}/reset-password?token=${resetToken}</p>
              
              <p>This reset link will expire in 10 minutes.</p>
              
              <p>If you didn't request this password reset, please ignore this email.</p>
              
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
      logger.error('Failed to send password reset email:', emailError);
      guest.passwordResetToken = undefined;
      guest.passwordResetExpires = undefined;
      await guest.save();
      
      return res.status(500).json({
        success: false,
        message: 'Error sending password reset email'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return value;
  })
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

    const { token, password } = req.body;

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find guest by token and check if token is still valid
    const guest = await Guest.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isRegistered: true
    });

    if (!guest) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }

    // Set new password
    guest.password = password;
    guest.passwordResetToken = undefined;
    guest.passwordResetExpires = undefined;
    await guest.save();

    logger.info('Password reset successful', {
      guestId: guest._id,
      email: guest.email
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with token
// @access  Public
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
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

    const { token } = req.body;

    const guest = await Guest.findOne({
      emailVerificationToken: token,
      isRegistered: true
    });

    if (!guest) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Verify email
    guest.emailVerified = true;
    guest.emailVerificationToken = undefined;
    await guest.save();

    logger.info('Email verification successful', {
      guestId: guest._id,
      email: guest.email
    });

    res.json({
      success: true,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

module.exports = router;