# The Old Vine Hotel - CMS Backend

Complete Content Management System (CMS) backend API for The Old Vine Hotel website.

## 🌐 Repository

**https://github.com/t-sharabi/oldvine_cms**

## ✨ Features

- 🔐 **Admin Authentication** - JWT-based authentication with role-based permissions
- 🏨 **Room Management** - Full CRUD operations for rooms and room categories
- 📅 **Booking System** - Complete booking management with guest tracking
- 💳 **Payment Processing** - Stripe integration for secure payments
- 📝 **Content Management** - Manage pages, blog posts, and site content
- 📸 **Media Library** - Upload and manage images and media files
- 🔗 **Third-Party Integrations** - Booking.com, Expedia, Opera PMS, Trip.com
- 📧 **Email Notifications** - Automated email sending for bookings and contacts
- 📊 **Analytics & Reporting** - Revenue reports and booking analytics
- 🛡️ **Security** - Helmet, rate limiting, CORS protection

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Stripe
- **Email**: Nodemailer
- **Logging**: Winston
- **Security**: Helmet, express-rate-limit

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher) - Can use Docker container
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/t-sharabi/oldvine_cms.git
cd oldvine_cms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=5080
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/oldvinehotel

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Client URL (for CORS)
CLIENT_URL=http://localhost:3060

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Cloudinary (Optional - for media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Start MongoDB

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**Or using local MongoDB:**
```bash
# macOS (Homebrew)
brew services start mongodb-community@7.0

# Linux
sudo systemctl start mongod
```

### 5. Seed Initial Data

```bash
# Create admin user
npm run seed:admin

# Seed content
npm run seed:content
```

Default admin credentials:
- **Username**: `admin`
- **Password**: `Admin@123456` (⚠️ Change in production!)

### 6. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5080`

## 📚 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/register` - Register new admin (super-admin only)
- `GET /api/admin/me` - Get current admin info

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room (admin)
- `PUT /api/rooms/:id` - Update room (admin)
- `DELETE /api/rooms/:id` - Delete room (admin)

### Room Categories
- `GET /api/room-categories` - List all categories
- `GET /api/room-categories/:slug` - Get category details
- `POST /api/room-categories` - Create category (admin)
- `PUT /api/room-categories/:id` - Update category (admin)

### Bookings
- `GET /api/bookings` - List all bookings (admin)
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking (admin)
- `GET /api/bookings/analytics/revenue` - Revenue analytics (admin)

### Content Management
- `GET /api/content/:page` - Get page content (home, about, etc.)
- `PUT /api/content/:page` - Update page content (admin)

### Gallery
- `GET /api/gallery-categories` - List gallery categories
- `GET /api/gallery-categories/:slug` - Get category details
- `POST /api/gallery-categories` - Create category (admin)

### Media
- `GET /api/media` - List media files (admin)
- `POST /api/upload` - Upload media file (admin)

### Settings
- `GET /api/settings` - Get site settings
- `PUT /api/settings` - Update settings (admin)

## 🔧 Development

### Project Structure

```
server/
├── index.js                 # Main server file
├── models/                 # MongoDB models
│   ├── Admin.js
│   ├── Room.js
│   ├── Booking.js
│   └── ...
├── routes/                 # API routes
│   ├── admin.js
│   ├── rooms.js
│   ├── bookings.js
│   └── ...
├── middleware/             # Express middleware
│   ├── adminAuth.js
│   └── errorHandler.js
├── services/               # External service integrations
│   ├── BookingComService.js
│   ├── ExpediaService.js
│   └── ...
├── utils/                  # Utility functions
│   ├── logger.js
│   └── sendEmail.js
└── scripts/                # Database seeding scripts
    ├── seedAdmin.js
    └── seedContent.js
```

### Available Scripts

```bash
# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Seed admin user
npm run seed:admin

# Seed content
npm run seed:content
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Super-admin, admin, editor, manager roles
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Helmet.js** - Security headers
- **CORS Protection** - Configured for specific origins
- **Input Validation** - express-validator for request validation
- **Password Hashing** - bcryptjs for secure password storage

## 📊 Database Models

- **Admin** - Admin users with roles and permissions
- **Room** - Hotel rooms with amenities and pricing
- **RoomCategory** - Room categories (Single, Double, Suite, etc.)
- **Booking** - Guest bookings with payment tracking
- **Guest** - Guest information and history
- **Content** - Page content (home, about, etc.)
- **BlogPost** - Blog articles
- **GalleryCategory** - Photo gallery categories
- **Media** - Uploaded media files
- **SiteSettings** - Site-wide settings

## 🔗 Integrations

### Supported Services

- **Booking.com API** - OTA integration
- **Expedia EQC** - Channel connectivity
- **Trip.com API** - Asian market integration
- **Opera PMS** - Property Management System sync
- **Stripe** - Payment processing
- **Cloudinary** - Media storage (optional)

## 📝 Environment Variables

See `.env.example` for all available environment variables.

## 🚀 Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start index.js --name oldvine-cms
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5080
CMD ["npm", "start"]
```

## 📄 License

MIT License

## 👥 Support

For issues or questions, please open an issue on GitHub.

---

**Note**: This is the backend CMS only. The frontend website is in a separate repository: [oldvine](https://github.com/t-sharabi/oldvine)

