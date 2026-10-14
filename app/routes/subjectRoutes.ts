import express from 'express';
import { subjectController } from '../controllers';
import { idParamValidation } from '../helpers/validators';

const router = express.Router();

// Subjects of my standard
router.get('/', subjectController.getSubjects);

// Subject with chapters
router.get('/:id', idParamValidation, subjectController.getSubjectDetails);

export default router;
