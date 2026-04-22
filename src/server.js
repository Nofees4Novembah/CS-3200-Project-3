import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import applicationRoutes from './routes/applications.js';
import { warmPendingApplicationsCache } from './services/applicationStore.js';
import { seedMockCollectionsIfEmpty } from './services/seedMockData.js';
import { initializeRedisCache } from './redisClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Express application bootstrap.
 *
 * Startup order:
 * 1. Seed MongoDB collections from the mock JSON files if they are empty.
 * 2. Warm the Redis cache with pending applications.
 * 3. Start serving the landlord review UI.
 */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.redirect('/applications');
});

app.use('/applications', applicationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).render('error', {
    message: 'Something went wrong while processing the request.'
  });
});

/**
 * Starts the application after data has been seeded and cached.
 */
async function startServer() {
  await initializeRedisCache();
  await seedMockCollectionsIfEmpty();
  await warmPendingApplicationsCache();

  app.listen(PORT, () => {
    console.log(`Landlord Application Review app running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
