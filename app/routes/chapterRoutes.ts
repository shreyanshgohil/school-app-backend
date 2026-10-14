import express from 'express';
import { chapterController } from '../controllers';
import { idParamValidation } from '../helpers/validators';

const router = express.Router();

// Chapter content, vocabulary and practice questions
router.get('/:id', idParamValidation, chapterController.getChapterDetails);

// Mark chapter as read
router.post('/:id/complete', idParamValidation, chapterController.completeChapter);

export default router;
