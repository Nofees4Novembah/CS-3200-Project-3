import express from 'express';
import {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication
} from '../services/applicationStore.js';

const router = express.Router();

/**
 * Routes for the landlord application review dashboard.
 *
 * The router delegates all persistence logic to the applicationStore service so
 * the controller layer stays focused on HTTP and template rendering.
 */

router.get('/', async (_req, res, next) => {
  try {
    const applications = await getAllApplications();
    res.render('applications/index', { applications });
  } catch (error) {
    next(error);
  }
});

router.get('/new', (_req, res) => {
  res.render('applications/new');
});

router.post('/', async (req, res, next) => {
  try {
    await createApplication(req.body);
    res.redirect('/applications');
  } catch (error) {
    next(error);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const application = await getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).render('error', { message: 'Application not found.' });
    }

    res.render('applications/edit', { application });
  } catch (error) {
    next(error);
  }
});

router.post('/:id', async (req, res, next) => {
  try {
    const updated = await updateApplication(req.params.id, req.body);
    if (!updated) {
      return res.status(404).render('error', { message: 'Application not found.' });
    }

    res.redirect('/applications');
  } catch (error) {
    next(error);
  }
});

router.post('/:id/delete', async (req, res, next) => {
  try {
    await deleteApplication(req.params.id);
    res.redirect('/applications');
  } catch (error) {
    next(error);
  }
});

export default router;
