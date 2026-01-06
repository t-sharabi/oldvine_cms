require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const GalleryCategory = require('../models/GalleryCategory');
const fs = require('fs');
const path = require('path');

const updateGalleryCategoryImages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vine_hotel');
    console.log('✅ Connected to MongoDB');

    // Define categories and their directories
    const categories = [
      { slug: 'hotel-gallery', name: 'Hotel Gallery' },
      { slug: 'restaurant-gallery', name: 'Restaurant Gallery' }
    ];

    const imagesBasePath = path.join(__dirname, '../../client/public/images/gallery');

    for (const categoryInfo of categories) {
      const categoryDir = path.join(imagesBasePath, categoryInfo.slug);
      
      // Check if directory exists
      if (!fs.existsSync(categoryDir)) {
        console.log(`⚠️  Directory not found: ${categoryDir}`);
        continue;
      }

      // Read all files in directory
      const files = fs.readdirSync(categoryDir)
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        })
        .sort((a, b) => {
          // Sort by filename numerically (01.jpg, 02.jpg, etc.)
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      if (files.length === 0) {
        console.log(`⚠️  No images found in ${categoryInfo.slug}`);
        continue;
      }

      // Build images array
      const images = files.map((file, index) => ({
        url: `/images/gallery/${categoryInfo.slug}/${file}`,
        alt: `${categoryInfo.name} - Image ${index + 1}`,
        isPrimary: index === 0, // First image is primary
        order: index
      }));

      // Find and update category
      const category = await GalleryCategory.findOne({ slug: categoryInfo.slug });
      
      if (!category) {
        console.log(`⚠️  Category not found in database: ${categoryInfo.slug}`);
        continue;
      }

      // Update category with images
      category.images = images;
      await category.save();

      console.log(`✅ Updated ${categoryInfo.name}: ${images.length} images`);
      console.log(`   Primary image: ${images[0].url}`);
    }

    // Summary
    console.log('\n📊 Summary:');
    const allCategories = await GalleryCategory.find().sort({ displayOrder: 1 });
    for (const cat of allCategories) {
      console.log(`  • ${cat.name}: ${cat.images.length} images`);
      if (cat.images.length > 0) {
        const primary = cat.images.find(img => img.isPrimary) || cat.images[0];
        console.log(`    Primary: ${primary.url}`);
      }
    }

    console.log('\n✅ All gallery category images updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating gallery category images:', error);
    process.exit(1);
  }
};

updateGalleryCategoryImages();

