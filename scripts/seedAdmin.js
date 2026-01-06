const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oldvinehotel', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ isSuperAdmin: true });

    if (existingAdmin) {
      console.log('Super admin already exists:');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      await mongoose.connection.close();
      return;
    }

    // Create default super admin
    const defaultAdmin = new Admin({
      username: 'admin',
      email: 'admin@oldvinehotel.com',
      password: 'Admin@123456', // Change this in production!
      firstName: 'Admin',
      lastName: 'User',
      role: 'super-admin',
      isSuperAdmin: true,
      permissions: [
        'manage_content',
        'manage_rooms',
        'manage_bookings',
        'manage_users',
        'manage_blog',
        'manage_gallery',
        'manage_settings',
        'view_analytics',
        'manage_admins'
      ]
    });

    await defaultAdmin.save();

    console.log('\n✅ Super admin created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: admin');
    console.log('Email:    admin@oldvinehotel.com');
    console.log('Password: Admin@123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  Please change the password after first login!');
    console.log('\n🌐 Admin Panel: http://localhost:3060/admin/login\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

