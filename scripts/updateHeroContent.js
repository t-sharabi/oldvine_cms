require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Content = require('../models/Content');

const updateHeroContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vine_hotel');
    console.log('✅ Connected to MongoDB');

    // Find and update homepage content
    const homepage = await Content.findOne({ page: 'home' });
    
    if (!homepage) {
      console.error('❌ Homepage content not found');
      process.exit(1);
    }

    // Update hero section
    homepage.hero = {
      title: 'Your Home Away From Home',
      subtitle: 'Experience Damascus Like Never Before',
      description: `Hidden within the winding alleys of the ancient city of Old Damascus, Old Vine Hotel is a 5-star boutique haven that captures the essence of Syria's timeless charm. Once three historic damascene homes, the properties have been lovingly restored and seamlessly connected to create an intimate sanctuary of 25 beautifully designed rooms and suites.

Each corner whispers stories of the past, where handcrafted wood, marble courtyards, and elegant fountains blend effortlessly with modern comfort and sophistication. from the moment you step inside, you are embraced by an atmosphere of serenity, authenticity, and understated luxury—a true reflection of Damascus at its beauty.`,
      backgroundImage: '/images/hero.jpg',
      ctaText: 'Explore Rooms',
      ctaLink: '/rooms'
    };

    await homepage.save();
    console.log('✅ Hero content updated successfully!');
    console.log('\n📝 New content:');
    console.log('Title:', homepage.hero.title);
    console.log('Subtitle:', homepage.hero.subtitle);
    console.log('Description:', homepage.hero.description.substring(0, 100) + '...');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating hero content:', error);
    process.exit(1);
  }
};

updateHeroContent();

