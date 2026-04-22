import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB_NAME || 'sublease_listing';

const mongoClient = new MongoClient(mongoUri);
let database;
let connected = false;

/**
 * Connects to MongoDB and stores the active database handle.
 */
async function connectMongo() {
  if (!database) {
    await mongoClient.connect();
    database = mongoClient.db(mongoDbName);
    connected = true;
  }

  return database;
}

/**
 * Closes the MongoDB client and clears cached handles.
 */
async function closeMongo() {
  if (connected) {
    await mongoClient.close();
    database = undefined;
    connected = false;
  }
}

/**
 * Returns a collection from the active MongoDB database.
 */
function getCollection(name) {
  if (!database) {
    throw new Error('MongoDB has not been initialized. Call connectMongo() first.');
  }

  return database.collection(name);
}

/**
 * Returns the collection that stores landlord application data.
 */
function getApplicationsCollection() {
  return getCollection('applications_mock');
}

export { connectMongo, closeMongo, getApplicationsCollection, getCollection };
