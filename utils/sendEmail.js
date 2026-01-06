const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const generateBookingConfirmationHTML = (context) => {
  const { guest, booking, room } = context;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .booking-details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; }
            .btn { background: #D4AF37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>The Old Vine Hotel</h1>
            <h2>Booking Confirmation</h2>
        </div>
        
        <div class="content">
            <p>Dear ${guest.firstName} ${guest.lastName},</p>
            
            <p>Thank you for choosing The Old Vine Hotel! We're delighted to confirm your reservation.</p>
            
            <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
                <p><strong>Confirmation Code:</strong> ${booking.confirmationCode}</p>
                <p><strong>Room:</strong> ${room.name} (${room.type})</p>
                <p><strong>Check-in:</strong> ${booking.checkInDate.toLocaleDateString()} (3:00 PM)</p>
                <p><strong>Check-out:</strong> ${booking.checkOutDate.toLocaleDateString()} (11:00 AM)</p>
                <p><strong>Guests:</strong> ${booking.numberOfGuests.adults} Adult(s)${booking.numberOfGuests.children ? `, ${booking.numberOfGuests.children} Child(ren)` : ''}</p>
                <p><strong>Nights:</strong> ${booking.numberOfNights}</p>
                <p><strong>Total Amount:</strong> $${booking.totalAmount.toFixed(2)}</p>
            </div>
            
            ${booking.specialRequests ? `
            <div class="booking-details">
                <h3>Special Requests</h3>
                <p>${booking.specialRequests}</p>
            </div>
            ` : ''}
            
            <h3>What to Expect</h3>
            <ul>
                <li>Luxury accommodations with premium amenities</li>
                <li>24/7 concierge service</li>
                <li>Complimentary WiFi throughout the hotel</li>
                <li>Fine dining restaurant and bar</li>
                <li>Spa and fitness center access</li>
            </ul>
            
            <h3>Hotel Information</h3>
            <p>
                <strong>Address:</strong> 123 Luxury Avenue, Downtown District, City, State 12345<br>
                <strong>Phone:</strong> +1 (555) 123-4567<br>
                <strong>Email:</strong> info@oldvinehotel.com
            </p>
            
            <p>If you need to modify or cancel your reservation, please contact us at least 24 hours in advance.</p>
            
            <p>We look forward to welcoming you to The Old Vine Hotel!</p>
            
            <p>Warm regards,<br>
            The Old Vine Hotel Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 The Old Vine Hotel. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
  `;
};

const generateBookingCancellationHTML = (context) => {
  const { guest, booking, room, cancellationFee, refundAmount } = context;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .booking-details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>The Old Vine Hotel</h1>
            <h2>Booking Cancellation</h2>
        </div>
        
        <div class="content">
            <p>Dear ${guest.firstName} ${guest.lastName},</p>
            
            <p>We have processed your cancellation request for the following booking:</p>
            
            <div class="booking-details">
                <h3>Cancelled Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
                <p><strong>Room:</strong> ${room.name}</p>
                <p><strong>Check-in Date:</strong> ${booking.checkInDate.toLocaleDateString()}</p>
                <p><strong>Check-out Date:</strong> ${booking.checkOutDate.toLocaleDateString()}</p>
                <p><strong>Original Amount:</strong> $${booking.totalAmount.toFixed(2)}</p>
                ${cancellationFee > 0 ? `<p><strong>Cancellation Fee:</strong> $${cancellationFee.toFixed(2)}</p>` : ''}
                <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
            </div>
            
            ${refundAmount > 0 ? `
            <p>Your refund of $${refundAmount.toFixed(2)} will be processed within 5-7 business days and will appear on your original payment method.</p>
            ` : ''}
            
            <p>We're sorry to see you cancel your stay with us. We hope to welcome you to The Old Vine Hotel in the future.</p>
            
            <p>If you have any questions about this cancellation, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            The Old Vine Hotel Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 The Old Vine Hotel. All rights reserved.</p>
        </div>
    </body>
    </html>
  `;
};

const generateContactFormHTML = (context) => {
  const { name, email, phone, message } = context;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>The Old Vine Hotel</h1>
            <h2>New Contact Form Submission</h2>
        </div>
        
        <div class="content">
            <h3>Contact Details</h3>
            <div class="details">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            </div>
            
            <h3>Message</h3>
            <div class="details">
                <p>${message}</p>
            </div>
            
            <p><em>This message was sent from the hotel website contact form.</em></p>
        </div>
    </body>
    </html>
  `;
};

// Main send email function
const sendEmail = async ({ to, subject, template, context, html, text }) => {
  try {
    const transporter = createTransporter();
    
    let emailHTML = html;
    
    // Generate HTML based on template
    if (template && context) {
      switch (template) {
        case 'bookingConfirmation':
          emailHTML = generateBookingConfirmationHTML(context);
          break;
        case 'bookingCancellation':
          emailHTML = generateBookingCancellationHTML(context);
          break;
        case 'contactForm':
          emailHTML = generateContactFormHTML(context);
          break;
        default:
          throw new Error(`Unknown email template: ${template}`);
      }
    }
    
    const mailOptions = {
      from: `"The Old Vine Hotel" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: emailHTML,
      text: text || '', // Plain text version
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully to ${to}`, {
      messageId: result.messageId,
      subject
    });
    
    return result;
  } catch (error) {
    logger.error('Email sending error:', {
      error: error.message,
      to,
      subject,
      template
    });
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send bulk emails
const sendBulkEmails = async (emails) => {
  const results = [];
  
  for (const emailData of emails) {
    try {
      const result = await sendEmail(emailData);
      results.push({ success: true, to: emailData.to, messageId: result.messageId });
    } catch (error) {
      results.push({ success: false, to: emailData.to, error: error.message });
    }
  }
  
  return results;
};

// Send newsletter
const sendNewsletter = async (subscribers, subject, content) => {
  const emails = subscribers.map(subscriber => ({
    to: subscriber.email,
    subject,
    html: content,
    template: null
  }));
  
  return sendBulkEmails(emails);
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendNewsletter
};