require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const RoomCategory = require('../models/RoomCategory');

const seedRoomCategories = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vine_hotel');
    console.log('✅ Connected to MongoDB');

    // Clear existing categories (optional - comment out if you want to keep existing)
    // await RoomCategory.deleteMany({});
    // console.log('🗑️  Cleared existing categories');

    const categories = [
      {
        name: 'Single Room',
        slug: 'single-room',
        description: 'Comfortable single rooms perfect for solo travelers. Each room is thoughtfully designed with modern amenities and traditional Damascene touches.',
        shortDescription: 'Perfect for solo travelers with modern amenities',
        displayOrder: 1,
        isActive: true,
        // Images will be added via CMS or manually
        // Placeholder structure - actual images should be uploaded via CMS
        images: [],
        features: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View'],
        metaTitle: 'Single Rooms - Old Vine Hotel',
        metaDescription: 'Comfortable single rooms perfect for solo travelers at Old Vine Hotel in Damascus.'
      },
      {
        name: 'Double Room',
        slug: 'double-room',
        description: 'Spacious double rooms ideal for couples or business travelers. Features comfortable double beds, elegant furnishings, and stunning views of Old Damascus.',
        shortDescription: 'Spacious rooms perfect for couples with elegant furnishings',
        displayOrder: 2,
        isActive: true,
        images: [],
        features: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View', 'Workspace', 'Balcony'],
        metaTitle: 'Double Rooms - Old Vine Hotel',
        metaDescription: 'Spacious double rooms with elegant furnishings and stunning views at Old Vine Hotel.'
      },
      {
        name: 'Suite Room',
        slug: 'suite-room',
        description: 'Luxurious suite rooms offering separate living areas, premium amenities, and exclusive services. Perfect for extended stays or special occasions.',
        shortDescription: 'Luxurious suites with separate living areas and premium amenities',
        displayOrder: 3,
        isActive: true,
        images: [],
        features: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View', 'Workspace', 'Balcony', 'Jacuzzi', 'Terrace'],
        metaTitle: 'Suite Rooms - Old Vine Hotel',
        metaDescription: 'Luxurious suite rooms with separate living areas at Old Vine Hotel in Damascus.'
      },
      {
        name: 'Twin Room',
        slug: 'twin-room',
        description: 'Comfortable twin rooms with two separate beds, ideal for friends or family traveling together. Features all modern amenities in a traditional setting.',
        shortDescription: 'Comfortable rooms with two beds, perfect for friends or family',
        displayOrder: 4,
        isActive: true,
        images: [],
        features: ['WiFi', 'TV', 'AC', 'Minibar', 'Safe', 'City View'],
        metaTitle: 'Twin Rooms - Old Vine Hotel',
        metaDescription: 'Comfortable twin rooms with two separate beds at Old Vine Hotel.'
      }
    ];

    // Insert or update categories
    for (const categoryData of categories) {
      const existingCategory = await RoomCategory.findOne({ slug: categoryData.slug });
      
      if (existingCategory) {
        // Update existing category but preserve images
        Object.keys(categoryData).forEach(key => {
          if (key !== 'images' || categoryData.images.length > 0) {
            existingCategory[key] = categoryData[key];
          }
        });
        await existingCategory.save();
        console.log(`✅ Updated category: ${categoryData.name}`);
      } else {
        const category = new RoomCategory(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      }
    }

    console.log('\n📊 Room Categories Summary:');
    const allCategories = await RoomCategory.find().sort({ displayOrder: 1 });
    allCategories.forEach(cat => {
      console.log(`  • ${cat.name} (${cat.slug}) - ${cat.images.length} images`);
    });

    console.log('\n✅ Room categories seeded successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Upload images for each category via CMS admin panel');
    console.log('  2. Assign rooms to categories');
    console.log('  3. Images should be placed in: /client/public/images/rooms/[category-slug]/');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding room categories:', error);
    process.exit(1);
  }
};

seedRoomCategories();

