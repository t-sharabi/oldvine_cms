const winston = require('winston');
const path = require('path');

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'old-vine-hotel-api' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write only booking-related logs
    new winston.transports.File({
      filename: path.join(logDir, 'bookings.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          return info.type === 'booking' ? info : false;
        })()
      ),
    }),
    
    // Write only payment-related logs
    new winston.transports.File({
      filename: path.join(logDir, 'payments.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          return info.type === 'payment' ? info : false;
        })()
      ),
    }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(info => {
        return `${info.timestamp} [${info.level}]: ${info.message} ${info.stack ? '\n' + info.stack : ''}`;
      })
    )
  }));
}

// Custom logging methods for specific contexts
logger.bookingLog = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'booking' });
};

logger.paymentLog = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'payment' });
};

logger.integrationLog = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'integration' });
};

logger.securityLog = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'security' });
};

// Error logging with context
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

// Request logging middleware
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      type: 'http'
    });
  });
  
  next();
};

module.exports = logger;