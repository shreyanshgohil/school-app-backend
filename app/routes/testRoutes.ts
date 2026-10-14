import express from 'express';
import { testController } from '../controllers';
import {
	idParamValidation,
	submitTestValidation,
	testListValidation,
} from '../helpers/validators';

const router = express.Router();

// This week's tests (?scope=past for earlier weeks)
router.get('/', testListValidation, testController.getTests);

// Test details
router.get('/:id', idParamValidation, testController.getTestDetails);

// Start test - get questions
router.post('/:id/start', idParamValidation, testController.startTest);

// Submit answers
router.post('/:id/submit', idParamValidation, submitTestValidation, testController.submitTest);

// Result with answer review
router.get('/:id/result', idParamValidation, testController.getTestResult);

export default router;
