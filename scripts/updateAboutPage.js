require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Content = require('../models/Content');

const updateAboutPage = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vine_hotel');
    console.log('✅ Connected to MongoDB');

    // Find and update about page content
    let aboutPage = await Content.findOne({ page: 'about' });
    
    if (!aboutPage) {
      console.log('📝 About page not found, creating new one...');
      aboutPage = new Content({ page: 'about' });
    }

    // Update heritage section
    const heritageSectionIndex = aboutPage.sections.findIndex(s => s.sectionId === 'heritage');
    
    const newHeritageSection = {
      sectionId: 'heritage',
      title: 'A Hidden Gem Of Old Damascus',
      content: `Old Vine Hotel stands as a living piece of history, where centuries-old craftsmanship and modern elegance unite in perfect harmony. the property features three tranquil courtyards, each shaded by climbing vines and fragrant citrus trees, offering guests peaceful spaces to relax and unwind.

From the terraces overlooking old Damascus and the new city, the views are simply breathtaking. the majestic Umayyad mosque feels almost within reach, its minarets visible from the terrace—an unforgettable sight that connects you directly to the heart of one of the world's oldest continuously inhabited cities.`
    };

    if (heritageSectionIndex !== -1) {
      aboutPage.sections[heritageSectionIndex] = newHeritageSection;
    } else {
      aboutPage.sections.push(newHeritageSection);
    }

    await aboutPage.save();
    console.log('✅ About page heritage section updated successfully!');
    console.log('\n📝 Heritage Section:');
    const heritageSection = aboutPage.sections.find(s => s.sectionId === 'heritage');
    console.log('Title:', heritageSection.title);
    console.log('Content:', heritageSection.content.substring(0, 150) + '...');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating about page:', error);
    process.exit(1);
  }
};

updateAboutPage();

