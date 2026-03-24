const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

async function debugBanIssue() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    
    console.log('=== DEBUGGING BAN ISSUE ===');
    
    // Get all users
    const users = await User.find({});
    console.log(`Total users in database: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  _id: ${user._id}`);
      console.log(`  id: ${user.id}`);
      console.log(`  email: ${user.email}`);
      console.log(`  isBanned: ${user.isBanned}`);
      console.log(`  name: ${user.name}`);
      console.log('---');
    });
    
    // Check if there's a pattern
    const bannedUsers = users.filter(u => u.isBanned);
    console.log(`Banned users: ${bannedUsers.length}`);
    
    if (bannedUsers.length > 0) {
      console.log('Banned user details:');
      bannedUsers.forEach(user => {
        console.log(`  ${user.email} (${user.id})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Debug error:', error.message);
    process.exit(1);
  }
}

debugBanIssue();
