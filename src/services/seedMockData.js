import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongo, closeMongo, getCollection } from '../mongodbClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCK_COLLECTION_FILES = [
  { fileName: 'applications_mock.json', collectionName: 'applications_mock' },
  { fileName: 'properties_final.json', collectionName: 'properties_final' },
  { fileName: 'sublease_listings_mock.json', collectionName: 'sublease_listings_mock' },
  { fileName: 'users_mock.json', collectionName: 'users_mock' }
];

/**
 * Checks whether a filesystem path exists.
 */
async function directoryExists(dirPath) {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDataDirectory() {
  const candidates = [
    path.join(__dirname, '../../data'),
    path.join(process.cwd(), '../data'),
    path.join(process.cwd(), 'data')
  ];

  for (const candidate of candidates) {
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Could not locate data directory for JSON mock seed files.');
}

/**
 * Loads a JSON file that must contain an array of documents.
 */
async function loadJsonArray(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Seed file ${filePath} must contain a JSON array.`);
  }

  return parsed;
}

/**
 * Seeds each MongoDB collection from the matching mock JSON file when the collection is empty.
 */
export async function seedMockCollectionsIfEmpty() {
  await connectMongo();
  try {
    const dataDirectory = await resolveDataDirectory();

    for (const item of MOCK_COLLECTION_FILES) {
      const collection = getCollection(item.collectionName);
      const existingCount = await collection.estimatedDocumentCount();

      if (existingCount > 0) {
        continue;
      }

      const filePath = path.join(dataDirectory, item.fileName);
      const documents = await loadJsonArray(filePath);

      if (!documents.length) {
        continue;
      }

      await collection.insertMany(documents, { ordered: false });
    }
  } finally {
    await closeMongo();
  }
}
