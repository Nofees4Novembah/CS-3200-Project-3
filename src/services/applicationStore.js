import crypto from 'crypto';
import { client, connectRedis, closeRedis } from '../redisClient.js';
import { connectMongo, closeMongo, getApplicationsCollection } from '../mongodbClient.js';

const APPLICATION_UNDER_REVIEW_KEY = 'application_under_review';

/**
 * Keeps application statuses aligned with the values used in applications_mock.json.
 */
function normalizeStatus(status) {
  const allowed = ['pending', 'approved', 'declined'];
  return allowed.includes(status) ? status : 'pending';
}

/**
 * Maps a MongoDB application document into the Redis-friendly shape used by the UI.
 */
function toCacheValue(doc) {
  const applicationStatus = normalizeStatus(doc.status || doc.application_status);
  return {
    _id: String(doc._id),
    applicant_id: doc.applicant_id || doc.applicantName || 'Unknown Applicant',
    listing_id: doc.listing_id || doc.propertyAddress || 'Unknown Listing',
    applied_at: doc.applied_at || doc.createdAt || new Date().toISOString().slice(0, 10),
    application_status: applicationStatus,
    ...(doc.contract ? { contract: doc.contract } : {})
  };
}

function parseCachedApplication(serialized) {
  // Redis stores values as JSON strings, so decode each hash value before use.
  return JSON.parse(serialized);
}

async function getApplicationByIdFromCache(id) {
  // Applications are indexed in a Redis hash by their string _id.
  const serialized = await client.hGet(APPLICATION_UNDER_REVIEW_KEY, id);
  if (!serialized) {
    return null;
  }

  return parseCachedApplication(serialized);
}

/**
 * Builds a MongoDB filter for the string-based application ids used in the mock JSON.
 */
function buildIdQuery(id) {
  return { _id: id };
}

/**
 * Rebuilds the Redis hash of pending applications from MongoDB.
 */
export async function warmPendingApplicationsCache() {
  await connectRedis();
  await connectMongo();
  try {
    const collection = getApplicationsCollection();
    // Accept either field name used historically for status in stored documents.
    const pendingApplications = await collection
      .find({
        $or: [{ status: 'pending' }, { application_status: 'pending' }]
      })
      .toArray();

    // Rebuild from scratch so Redis reflects MongoDB as the source of truth.
    await client.del(APPLICATION_UNDER_REVIEW_KEY);
    if (!pendingApplications.length) {
      return [];
    }

    const hashPayload = {};
    const cacheValues = pendingApplications.map((doc) => toCacheValue(doc));
    for (const app of cacheValues) {
      // Redis hash values must be strings, so each application is serialized.
      hashPayload[app._id] = JSON.stringify(app);
    }

    await client.hSet(APPLICATION_UNDER_REVIEW_KEY, hashPayload);
    return cacheValues.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  } finally {
    await closeRedis();
    await closeMongo();
  }
}

/**
 * Creates a new landlord application in MongoDB and mirrors pending records into Redis.
 */
export async function createApplication(payload) {
  await connectRedis();
  await connectMongo();
  try {
    const normalizedStatus = normalizeStatus(payload.status);
    const appliedAt = new Date().toISOString().slice(0, 10);

    const application = {
      _id: payload.id || crypto.randomUUID(),
      applicant_id: payload.applicant_id?.trim() || 'Unknown Applicant',
      listing_id: payload.listing_id?.trim() || 'Unknown Listing',
      applied_at: payload.applied_at?.trim() || appliedAt,
      application_status: normalizedStatus,
      ...(payload.contract ? { contract: payload.contract } : {})
    };

    const collection = getApplicationsCollection();
    await collection.insertOne(application);

    const cacheValue = toCacheValue(application);
    // Only pending applications are shown in the landlord review queue.
    if (cacheValue.application_status === 'pending') {
      await client.hSet(APPLICATION_UNDER_REVIEW_KEY, cacheValue._id, JSON.stringify(cacheValue));
    }

    return cacheValue;
  } finally {
    await closeRedis();
    await closeMongo();
  }
}

/**
 * Returns all cached pending applications for the dashboard.
 */
export async function getAllApplications() {
  await connectRedis();
  try {
    const cachedApplications = await client.hGetAll(APPLICATION_UNDER_REVIEW_KEY);
    if (!Object.keys(cachedApplications).length) {
      // Lazy warm-up: repopulate Redis on first read or after eviction/reset.
      return warmPendingApplicationsCache();
    }

    // Convert the hash map values into objects for sorting/rendering.
    const applications = Object.values(cachedApplications).map(parseCachedApplication);

    return applications.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  } finally {
    await closeRedis();
  }
}

/**
 * Reads one application from the Redis cache by application id.
 */
export async function getApplicationById(id) {
  await connectRedis();
  try {
    return await getApplicationByIdFromCache(id);
  } finally {
    await closeRedis();
  }
}

/**
 * Updates the MongoDB record and keeps the Redis cache in sync.
 */
export async function updateApplication(id, updates) {
  await connectRedis();
  await connectMongo();
  try {
    const existing = await getApplicationByIdFromCache(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      applicant_id: updates.applicant_id?.trim() || existing.applicant_id,
      listing_id: updates.listing_id?.trim() || existing.listing_id,
      applied_at: updates.applied_at?.trim() || existing.applied_at,
      // Guard status to known values so UI and storage stay consistent.
      application_status: normalizeStatus(updates.application_status || existing.application_status)
    };

    const collection = getApplicationsCollection();
    await collection.updateOne(
      buildIdQuery(id),
      {
        $set: {
          applicant_id: updated.applicant_id,
          listing_id: updated.listing_id,
          applied_at: updated.applied_at,
          application_status: updated.application_status
        }
      }
    );

    if (updated.application_status === 'pending') {
      // Keep pending applications visible in the Redis review hash.
      await client.hSet(APPLICATION_UNDER_REVIEW_KEY, id, JSON.stringify(updated));
    } else {
      // Non-pending records are removed from the review queue cache.
      await client.hDel(APPLICATION_UNDER_REVIEW_KEY, id);
    }

    return updated;
  } finally {
    await closeRedis();
    await closeMongo();
  }
}

/**
 * Deletes an application from MongoDB and removes it from the Redis cache.
 */
export async function deleteApplication(id) {
  await connectRedis();
  await connectMongo();
  try {
    const collection = getApplicationsCollection();
    const deleted = await collection.deleteOne(buildIdQuery(id));
    // Ensure Redis does not retain stale entries after a delete.
    await client.hDel(APPLICATION_UNDER_REVIEW_KEY, id);

    return deleted.deletedCount > 0;
  } finally {
    await closeRedis();
    await closeMongo();
  }
}

