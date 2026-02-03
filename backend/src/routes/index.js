import express from 'express';
import authRoutes from './auth.js';
import patientsRoutes from './patients.js';
import sessionsRoutes from './sessions.js';
import medicalRecordsRoutes from './medical-records.js';
import financialRoutes from './financial.js';
import clinicSettingsRoutes from './clinic-settings.js';
import integrationsRoutes from './integrations.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', authRoutes);

// Protect the core API by default.
router.use(requireAuth);
router.use('/patients', patientsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/medical-records', medicalRecordsRoutes);
router.use('/financial', financialRoutes);
router.use('/clinic-settings', clinicSettingsRoutes);
router.use('/integrations', integrationsRoutes); 

export default router;
