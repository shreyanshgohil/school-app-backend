import express from 'express';
import {
	adController,
	adminContentController,
	adminDashboardController,
	adminQuestionController,
	adminTestController,
	adminUserController,
} from '../../controllers';
import {
	adminTestListValidation,
	createAdValidation,
	createChapterValidation,
	createHomeworkValidation,
	createMaterialValidation,
	createQuestionValidation,
	createStaffValidation,
	createSubjectValidation,
	createTestValidation,
	generateQuestionsValidation,
	grantSubscriptionValidation,
	idParamValidation,
	materialListValidation,
	paginationValidation,
	questionListValidation,
	resetPasswordValidation,
	resultListValidation,
	reviewQuestionsValidation,
	standardQueryValidation,
	studentListValidation,
	studentUpdateValidation,
	subjectQueryValidation,
	testStatusValidation,
	updateAdValidation,
	updateChapterValidation,
	updateHomeworkValidation,
	updateMaterialValidation,
	updateQuestionValidation,
	updateSubjectValidation,
	updateStaffValidation,
	updateTestValidation,
} from '../../helpers/validators';
import { isAdmin } from '../../middlewares/adminMiddleware';

// Mounted behind isAuthenticated + isStaff (admins and teachers)
const router = express.Router();

// Dashboard & results
router.get('/dashboard', adminDashboardController.getStats);
router.get('/results', resultListValidation, adminDashboardController.getResults);

// Students (admin only)
router.get('/students', isAdmin, studentListValidation, adminUserController.getStudents);
router.get('/students/:id', isAdmin, idParamValidation, adminUserController.getStudentDetails);
router.get('/students/:id/progress', idParamValidation, adminDashboardController.getStudentProgress);
router.put(
	'/students/:id',
	isAdmin,
	idParamValidation,
	studentUpdateValidation,
	adminUserController.updateStudent
);
router.put(
	'/students/:id/password',
	isAdmin,
	idParamValidation,
	resetPasswordValidation,
	adminUserController.resetPassword
);
router.post(
	'/students/:id/subscription',
	isAdmin,
	idParamValidation,
	grantSubscriptionValidation,
	adminUserController.grantSubscription
);

// Staff (admin only)
router.get('/staff', isAdmin, paginationValidation, adminUserController.getStaff);
router.post('/staff', isAdmin, createStaffValidation, adminUserController.createStaff);
router.put('/staff/:id', isAdmin, idParamValidation, updateStaffValidation, adminUserController.updateStaff);

// Question bank
router.get('/questions', questionListValidation, adminQuestionController.getQuestions);
router.get('/questions/:id', idParamValidation, adminQuestionController.getQuestion);
router.post('/questions', createQuestionValidation, adminQuestionController.createQuestion);
router.post(
	'/questions/generate',
	generateQuestionsValidation,
	adminQuestionController.generateQuestions
);
router.post('/questions/review', reviewQuestionsValidation, adminQuestionController.reviewQuestions);
router.put(
	'/questions/:id',
	idParamValidation,
	updateQuestionValidation,
	adminQuestionController.updateQuestion
);
router.delete('/questions/:id', idParamValidation, adminQuestionController.deleteQuestion);

// Weekly tests
router.get('/tests', adminTestListValidation, adminTestController.getTests);
router.get('/tests/:id', idParamValidation, adminTestController.getTestDetails);
router.post('/tests', createTestValidation, adminTestController.createTest);
router.put('/tests/:id', idParamValidation, updateTestValidation, adminTestController.updateTest);
router.patch(
	'/tests/:id/status',
	idParamValidation,
	testStatusValidation,
	adminTestController.updateTestStatus
);
router.delete('/tests/:id', idParamValidation, adminTestController.deleteTest);

// Subjects
router.get('/subjects', standardQueryValidation, adminContentController.getSubjects);
router.post('/subjects', createSubjectValidation, adminContentController.createSubject);
router.put(
	'/subjects/:id',
	idParamValidation,
	updateSubjectValidation,
	adminContentController.updateSubject
);

// Chapters
router.get('/chapters', subjectQueryValidation, adminContentController.getChapters);
router.get('/chapters/:id', idParamValidation, adminContentController.getChapter);
router.post('/chapters', createChapterValidation, adminContentController.createChapter);
router.put(
	'/chapters/:id',
	idParamValidation,
	updateChapterValidation,
	adminContentController.updateChapter
);
router.delete('/chapters/:id', idParamValidation, adminContentController.deleteChapter);

// Study material
router.get(
	'/materials',
	standardQueryValidation,
	materialListValidation,
	adminContentController.getMaterials
);
router.get('/materials/:id', idParamValidation, adminContentController.getMaterial);
router.post('/materials', createMaterialValidation, adminContentController.createMaterial);
router.put(
	'/materials/:id',
	idParamValidation,
	updateMaterialValidation,
	adminContentController.updateMaterial
);
router.delete('/materials/:id', idParamValidation, adminContentController.deleteMaterial);

// Homework
router.get('/homework', standardQueryValidation, adminContentController.getHomework);
router.get('/homework/:id', idParamValidation, adminContentController.getHomeworkItem);
router.post('/homework', createHomeworkValidation, adminContentController.createHomework);
router.put(
	'/homework/:id',
	idParamValidation,
	updateHomeworkValidation,
	adminContentController.updateHomework
);
router.delete('/homework/:id', idParamValidation, adminContentController.deleteHomework);

// Ads (admin only)
router.get('/ads', isAdmin, adController.getAll);
router.get('/ads/:id', isAdmin, idParamValidation, adController.getById);
router.post('/ads', isAdmin, createAdValidation, adController.create);
router.put('/ads/:id', isAdmin, idParamValidation, updateAdValidation, adController.update);
router.delete('/ads/:id', isAdmin, idParamValidation, adController.delete);

export default router;
