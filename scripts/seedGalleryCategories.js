require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const GalleryCategory = require('../models/GalleryCategory');

const seedGalleryCategories = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vine_hotel');
    console.log('✅ Connected to MongoDB');

    const categories = [
      {
        name: 'Hotel Gallery',
        slug: 'hotel-gallery',
        description: 'Explore the beautiful interiors, architecture, and spaces of Old Vine Hotel. From elegant rooms to stunning courtyards, discover the charm of our historic property.',
        shortDescription: 'Beautiful interiors, architecture, and spaces of our hotel',
        displayOrder: 1,
        isActive: true,
        images: [],
        metaTitle: 'Hotel Gallery - Old Vine Hotel',
        metaDescription: 'Explore the beautiful interiors and architecture of Old Vine Hotel in Old Damascus.'
      },
      {
        name: 'Restaurant Gallery',
        slug: 'restaurant-gallery',
        description: 'Take a visual journey through our restaurant and dining spaces. Experience the ambiance, cuisine presentations, and elegant settings where culinary excellence meets authentic Syrian hospitality.',
        shortDescription: 'Restaurant ambiance, cuisine, and dining experiences',
        displayOrder: 2,
        isActive: true,
        images: [],
        metaTitle: 'Restaurant Gallery - Old Vine Hotel',
        metaDescription: 'Explore our restaurant and dining spaces at Old Vine Hotel.'
      }
    ];

    // Insert or update categories
    for (const categoryData of categories) {
      const existingCategory = await GalleryCategory.findOne({ slug: categoryData.slug });
      
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
        const category = new GalleryCategory(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      }
    }

    console.log('\n📊 Gallery Categories Summary:');
    const allCategories = await GalleryCategory.find().sort({ displayOrder: 1 });
    allCategories.forEach(cat => {
      console.log(`  • ${cat.name} (${cat.slug}) - ${cat.images.length} images`);
    });

    console.log('\n✅ Gallery categories seeded successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Upload images for each category');
    console.log('  2. Images should be placed in: /client/public/images/gallery/[category-slug]/');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding gallery categories:', error);
    process.exit(1);
  }
};

seedGalleryCategories();

