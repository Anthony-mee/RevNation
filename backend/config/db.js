const mongoose = require("mongoose");
const config = require("./index");

async function connectDatabase() {
  if (!config.connectionString) {
    throw new Error("Missing CONNECTION_STRING in environment variables.");
  }

  // If no dbName is provided, MongoDB Atlas defaults to the "test" database.
  await mongoose.connect(config.connectionString, { dbName: config.dbName });
  console.log(`[db] MongoDB connected host=${mongoose.connection.host} db=${mongoose.connection.name}`);
}

module.exports = connectDatabase;
