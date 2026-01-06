const mongoose = require('mongoose');
const Content = require('../models/Content');
const Room = require('../models/Room');
const SiteSettings = require('../models/SiteSettings');
require('dotenv').config();

const seedContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oldvinehotel', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // ==================== HOMEPAGE CONTENT ====================
    const homePageExists = await Content.findOne({ page: 'home' });
    if (!homePageExists) {
      await Content.create({
        page: 'home',
        hero: {
          title: 'Welcome to Old Vine Hotel',
          subtitle: 'Experience Luxury in the Heart of Old Damascus',
          description: 'Discover timeless elegance and authentic Syrian hospitality in our beautifully restored historic hotel.',
          backgroundImage: '/images/hero.jpg',
          ctaText: 'Explore Rooms',
          ctaLink: '/rooms'
        },
        sections: [
          {
            sectionId: 'welcome',
            title: 'Your Home Away From Home',
            subtitle: 'Experience Damascus Like Never Before',
            content: 'Nestled in the historic heart of Old Damascus, Old Vine Hotel offers an unforgettable blend of traditional Syrian architecture and modern luxury. Each room tells a story, each corner whispers history, and every moment creates lasting memories.',
            order: 1,
            isActive: true,
            layout: 'full-width'
          },
          {
            sectionId: 'features',
            title: 'Exceptional Amenities',
            subtitle: 'Everything You Need for a Perfect Stay',
            content: 'From luxurious accommodations to world-class dining, every detail has been carefully crafted to ensure your comfort.',
            order: 2,
            isActive: true,
            layout: 'full-width',
            items: [
              { icon: 'wifi', title: 'Free Wi-Fi', description: 'High-speed internet throughout the hotel' },
              { icon: 'restaurant', title: 'Fine Dining', description: 'Authentic Syrian and international cuisine' },
              { icon: 'spa', title: 'Spa & Wellness', description: 'Relax and rejuvenate in our spa' },
              { icon: 'concierge', title: '24/7 Concierge', description: 'Personalized service anytime' }
            ]
          }
        ],
        seo: {
          title: 'Old Vine Hotel - Luxury Hotel in Old Damascus',
          description: 'Experience timeless elegance and authentic Syrian hospitality at Old Vine Hotel, a beautifully restored historic hotel in the heart of Old Damascus.',
          keywords: ['damascus hotel', 'old damascus', 'luxury hotel syria', 'boutique hotel damascus'],
          ogImage: '/images/hero.jpg'
        },
        isPublished: true,
        publishedAt: new Date()
      });
      console.log('✅ Created homepage content');
    } else {
      console.log('ℹ️  Homepage content already exists');
    }

    // ==================== ABOUT PAGE CONTENT ====================
    const aboutPageExists = await Content.findOne({ page: 'about' });
    if (!aboutPageExists) {
      await Content.create({
        page: 'about',
        hero: {
          title: 'Our Story',
          subtitle: 'A Legacy of Hospitality Since Heritage',
          description: 'Discover the rich history and timeless charm of Old Vine Hotel',
          backgroundImage: '/images/about-hero.jpg'
        },
        sections: [
          {
            sectionId: 'heritage',
            title: 'Our Heritage',
            content: 'Old Vine Hotel stands as a testament to the timeless beauty of Old Damascus. Built within the ancient walls of the historic city, our hotel preserves the architectural grandeur of traditional Damascene houses while offering contemporary comfort and luxury.\n\nEvery stone in our building has witnessed centuries of history, and we are honored to be custodians of this heritage. Our restoration project has carefully maintained the original character of the structure, from the intricate geometric patterns to the central courtyard that has welcomed guests for generations.',
            image: '/images/about.jpg',
            order: 1,
            isActive: true,
            layout: 'right-image'
          },
          {
            sectionId: 'mission',
            title: 'Our Mission',
            content: 'To provide an authentic Damascus experience that honors our cultural heritage while delivering world-class hospitality. We believe in creating meaningful connections between our guests and the rich tapestry of Syrian culture, history, and tradition.',
            order: 2,
            isActive: true,
            layout: 'left-image'
          },
          {
            sectionId: 'vision',
            title: 'Our Vision',
            content: 'To be the premier destination for travelers seeking an authentic cultural experience in Damascus. We strive to preserve and share the beauty of Old Damascus while setting new standards in hospitality and guest satisfaction.',
            order: 3,
            isActive: true,
            layout: 'full-width'
          },
          {
            sectionId: 'values',
            title: 'Our Values',
            content: 'We are guided by principles of excellence, authenticity, and respect for our heritage.',
            order: 4,
            isActive: true,
            layout: 'full-width',
            items: [
              { title: 'Authenticity', description: 'Preserving and celebrating Syrian culture and traditions' },
              { title: 'Excellence', description: 'Delivering world-class service and hospitality' },
              { title: 'Heritage', description: 'Honoring the history and architecture of Old Damascus' },
              { title: 'Innovation', description: 'Blending tradition with modern comfort and technology' }
            ]
          }
        ],
        seo: {
          title: 'About Old Vine Hotel - Our Story and Heritage',
          description: 'Learn about Old Vine Hotel\'s rich history, mission, and commitment to preserving the cultural heritage of Old Damascus while providing exceptional hospitality.',
          keywords: ['damascus heritage', 'historic hotel damascus', 'old damascus architecture'],
          ogImage: '/images/about-hero.jpg'
        },
        isPublished: true,
        publishedAt: new Date()
      });
      console.log('✅ Created about page content');
    } else {
      console.log('ℹ️  About page content already exists');
    }

    // ==================== ROOMS ====================
    // NOTE: Rooms need to match the actual Room schema which has specific requirements
    const deluxeExists = await Room.findOne({ roomNumber: '101' });
    if (!deluxeExists) {
      await Room.create({
        name: 'Deluxe Room',
        type: 'Deluxe',
        slug: 'deluxe-room',
        description: 'Experience comfort and elegance in our spacious Deluxe Room, featuring traditional Damascene decor with modern amenities. Perfect for couples or solo travelers seeking a blend of authentic charm and contemporary comfort.',
        shortDescription: 'Elegant comfort with traditional charm',
        roomNumber: '101',
        floor: 1,
        size: 35,
        maxOccupancy: 2,
        bedType: 'King',
        bedCount: 1,
        basePrice: 150,
        amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View', 'Workspace'],
        images: [
          { url: '/images/rooms/deluxe/01.jpg', alt: 'Deluxe Room - Bedroom', isPrimary: true },
          { url: '/images/rooms/deluxe/02.jpg', alt: 'Deluxe Room - Bathroom', isPrimary: false },
          { url: '/images/rooms/deluxe/03.jpg', alt: 'Deluxe Room - Seating Area', isPrimary: false },
          { url: '/images/rooms/deluxe/04.jpg', alt: 'Deluxe Room - View', isPrimary: false }
        ],
        status: 'Available',
        isActive: true,
        smokingAllowed: false,
        petsAllowed: false,
        cleaningStatus: 'Clean',
        metaTitle: 'Deluxe Room - Old Vine Hotel',
        metaDescription: 'Experience comfort and elegance in our spacious Deluxe Room with traditional Damascene decor.'
      });
      console.log('✅ Created Deluxe Room');
    } else {
      console.log('ℹ️  Deluxe Room already exists');
    }

    const executiveExists = await Room.findOne({ roomNumber: '201' });
    if (!executiveExists) {
      await Room.create({
        name: 'Executive Suite',
        type: 'Executive Suite',
        slug: 'executive-suite',
        description: 'Indulge in luxury with our Executive Suite, offering separate living space, premium amenities, and stunning views of Old Damascus. Ideal for business travelers or those seeking extra space and comfort during their stay.',
        shortDescription: 'Premium luxury with separate living area',
        roomNumber: '201',
        floor: 2,
        size: 55,
        maxOccupancy: 3,
        bedType: 'King',
        bedCount: 1,
        basePrice: 250,
        amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View', 'Workspace', 'Balcony', 'Jacuzzi'],
        images: [
          { url: '/images/rooms/executive/01.jpg', alt: 'Executive Suite - Living Room', isPrimary: true },
          { url: '/images/rooms/executive/02.jpg', alt: 'Executive Suite - Bedroom', isPrimary: false },
          { url: '/images/rooms/executive/03.jpg', alt: 'Executive Suite - Bathroom', isPrimary: false },
          { url: '/images/rooms/executive/04.jpg', alt: 'Executive Suite - View', isPrimary: false }
        ],
        status: 'Available',
        isActive: true,
        smokingAllowed: false,
        petsAllowed: false,
        cleaningStatus: 'Clean',
        metaTitle: 'Executive Suite - Old Vine Hotel',
        metaDescription: 'Indulge in luxury with our Executive Suite offering separate living space and stunning views.'
      });
      console.log('✅ Created Executive Suite');
    } else {
      console.log('ℹ️  Executive Suite already exists');
    }

    const presidentialExists = await Room.findOne({ roomNumber: '301' });
    if (!presidentialExists) {
      await Room.create({
        name: 'Presidential Suite',
        type: 'Presidential Suite',
        slug: 'presidential-suite',
        description: 'The epitome of luxury, our Presidential Suite offers unparalleled elegance, spacious living areas, and exclusive amenities for the most discerning guests. Experience the finest accommodation Old Damascus has to offer.',
        shortDescription: 'Ultimate luxury and exclusive service',
        roomNumber: '301',
        floor: 3,
        size: 85,
        maxOccupancy: 4,
        bedType: 'King',
        bedCount: 2,
        basePrice: 450,
        amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View', 'Workspace', 'Balcony', 'Jacuzzi', 'Terrace', 'Walk-in Closet', 'Butler Service'],
        images: [
          { url: '/images/rooms/presidential/01.jpg', alt: 'Presidential Suite - Main Living Area', isPrimary: true },
          { url: '/images/rooms/presidential/02.jpg', alt: 'Presidential Suite - Master Bedroom', isPrimary: false },
          { url: '/images/rooms/presidential/03.jpg', alt: 'Presidential Suite - Spa Bathroom', isPrimary: false },
          { url: '/images/rooms/presidential/04.jpg', alt: 'Presidential Suite - Private Terrace', isPrimary: false }
        ],
        status: 'Available',
        isActive: true,
        smokingAllowed: false,
        petsAllowed: false,
        cleaningStatus: 'Clean',
        metaTitle: 'Presidential Suite - Old Vine Hotel',
        metaDescription: 'The epitome of luxury with unparalleled elegance, spacious living areas, and exclusive amenities.'
      });
      console.log('✅ Created Presidential Suite');
    } else {
      console.log('ℹ️  Presidential Suite already exists');
    }

    // ==================== SITE SETTINGS ====================
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({
        siteName: 'Old Vine Hotel',
        siteDescription: 'Experience luxury and authentic Syrian hospitality in the heart of Old Damascus',
        siteKeywords: 'damascus hotel, old damascus, luxury hotel syria, boutique hotel damascus, historic hotel',
        contactEmail: 'info@oldvinehotel.com',
        contactPhone: '+963 986 703 070',
        whatsapp: '+963 986 703 070',
        address: {
          street: 'Old Damascus City',
          city: 'Damascus',
          country: 'Syria',
          coordinates: {
            lat: 33.5138,
            lng: 36.2765
          }
        },
        socialMedia: {
          facebook: 'https://facebook.com/oldvinehotel',
          instagram: 'https://instagram.com/oldvinehotel',
          twitter: 'https://twitter.com/oldvinehotel'
        },
        theme: {
          primaryColor: '#8B4513',
          secondaryColor: '#D4AF37',
          accentColor: '#2C5F2D'
        },
        bookingSettings: {
          minNights: 1,
          maxNights: 30,
          checkInTime: '14:00',
          checkOutTime: '12:00',
          cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
        },
        seo: {
          metaTitle: 'Old Vine Hotel - Luxury Accommodation in Old Damascus',
          metaDescription: 'Experience timeless elegance and authentic Syrian hospitality at Old Vine Hotel, a beautifully restored historic hotel in the heart of Old Damascus.',
          ogImage: '/images/hero.jpg'
        }
      });
      console.log('✅ Created site settings');
    } else {
      console.log('ℹ️  Site settings already exist');
    }

    console.log('\n✅✅✅ CONTENT SEEDING COMPLETED! ✅✅✅\n');
    console.log('📊 Summary:');
    console.log('   - Homepage content: Ready');
    console.log('   - About page content: Ready');
    console.log('   - Rooms (3): Deluxe (101), Executive (201), Presidential (301)');
    console.log('   - Site settings: Configured');
    console.log('\n🔗 Next: Public website will fetch from these entries\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding content:', error);
    process.exit(1);
  }
};

seedContent();
