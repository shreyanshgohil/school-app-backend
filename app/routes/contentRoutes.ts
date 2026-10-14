import express from 'express';
import { contentController } from '../controllers';
import { materialListValidation } from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';

const router = express.Router();

// Study material (?type=NOTE|PDF|VIDEO&subjectId=)
router.get('/materials', isAuthenticated, materialListValidation, contentController.getMaterials);

// Homework
router.get('/homework', isAuthenticated, contentController.getHomework);

export default router;
