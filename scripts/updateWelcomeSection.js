require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Content = require('../models/Content');

const updateWelcomeSection = async () => {
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

    // Revert hero section to original
    homepage.hero = {
      title: 'Your Home Away From Home',
      subtitle: 'Experience Damascus Like Never Before',
      description: 'Nestled in the historic heart of Old Damascus, Old Vine Hotel offers an unforgettable blend of traditional Syrian architecture and modern luxury. Each room tells a story, each corner whispers history, and every moment creates lasting memories.',
      backgroundImage: '/images/hero.jpg',
      ctaText: 'Explore Rooms',
      ctaLink: '/rooms'
    };

    // Update welcome section (the area below the hero)
    const welcomeSectionIndex = homepage.sections.findIndex(s => s.sectionId === 'welcome');
    
    if (welcomeSectionIndex !== -1) {
      homepage.sections[welcomeSectionIndex] = {
        sectionId: 'welcome',
        title: 'Your Home Away From Home',
        subtitle: 'Experience Damascus Like Never Before',
        content: `Hidden within the winding alleys of the ancient city of Old Damascus, Old Vine Hotel is a 5-star boutique haven that captures the essence of Syria's timeless charm. Once three historic damascene homes, the properties have been lovingly restored and seamlessly connected to create an intimate sanctuary of 25 beautifully designed rooms and suites.

Each corner whispers stories of the past, where handcrafted wood, marble courtyards, and elegant fountains blend effortlessly with modern comfort and sophistication. from the moment you step inside, you are embraced by an atmosphere of serenity, authenticity, and understated luxury—a true reflection of Damascus at its beauty.`
      };
    } else {
      // Add welcome section if it doesn't exist
      homepage.sections.push({
        sectionId: 'welcome',
        title: 'Your Home Away From Home',
        subtitle: 'Experience Damascus Like Never Before',
        content: `Hidden within the winding alleys of the ancient city of Old Damascus, Old Vine Hotel is a 5-star boutique haven that captures the essence of Syria's timeless charm. Once three historic damascene homes, the properties have been lovingly restored and seamlessly connected to create an intimate sanctuary of 25 beautifully designed rooms and suites.

Each corner whispers stories of the past, where handcrafted wood, marble courtyards, and elegant fountains blend effortlessly with modern comfort and sophistication. from the moment you step inside, you are embraced by an atmosphere of serenity, authenticity, and understated luxury—a true reflection of Damascus at its beauty.`
      });
    }

    await homepage.save();
    console.log('✅ Hero section reverted to original!');
    console.log('✅ Welcome section updated successfully!');
    console.log('\n📝 Welcome Section:');
    const welcomeSection = homepage.sections.find(s => s.sectionId === 'welcome');
    console.log('Title:', welcomeSection.title);
    console.log('Subtitle:', welcomeSection.subtitle);
    console.log('Content:', welcomeSection.content.substring(0, 100) + '...');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating content:', error);
    process.exit(1);
  }
};

updateWelcomeSection();

