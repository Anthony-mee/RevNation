/**
 * Quick script to make a user an admin
 * Run this to fix admin access issues
 */

const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

async function makeUserAdmin() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get user email from command line argument
        const email = process.argv[2];
        
        if (!email) {
            console.log('Usage: node make-admin.js <user-email>');
            process.exit(1);
        }

        // Find and update user
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            process.exit(1);
        }

        // Update user to admin
        user.isAdmin = true;
        await user.save();

        console.log(`✅ User ${email} is now an admin!`);
        console.log(`User ID: ${user._id}`);
        console.log(`Name: ${user.name}`);
        
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

makeUserAdmin();
