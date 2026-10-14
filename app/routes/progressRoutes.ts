import express from 'express';
import { progressController } from '../controllers';
import { progressCardValidation } from '../helpers/validators';

const router = express.Router();

// Totals and subject-wise progress
router.get('/summary', progressController.getSummary);

// Weekly progress card (?weeks=12)
router.get('/card', progressCardValidation, progressController.getProgressCard);

export default router;
