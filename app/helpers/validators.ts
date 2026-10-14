import { body, param, query, ValidationChain } from 'express-validator';
import { PLAN_MONTHS } from '../constants/plans';
import {
	AdType,
	Difficulty,
	MaterialType,
	QuestionStatus,
	TestStatus,
	UserRole,
} from '../generated/prisma/enums';

// Same rules for create (required) and update (optional) - avoids two copies of every chain
const field = (name: string, optional: boolean) => (optional ? body(name).optional() : body(name));

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
// http(s) links only; no TLD required so local dev hosts (localhost) work too
const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true, require_tld: false };

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export const idParamValidation = [param('id').isUUID().withMessage('અમાન્ય ID')];

export const paginationValidation = [
	query('page').optional().isInt({ min: 1 }).toInt(),
	query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const standardIdRule = (optional: boolean) =>
	field('standardId', optional)
		.isInt({ min: 1, max: 10 })
		.withMessage('ધોરણ 1 થી 10 માંથી પસંદ કરો')
		.toInt();

// ---------------------------------------------------------------------------
// Auth (student facing - Gujarati messages)
// ---------------------------------------------------------------------------

export const registerValidationRules = [
	body('fullName')
		.trim()
		.notEmpty()
		.withMessage('કૃપા કરીને તમારું નામ લખો')
		.isLength({ max: 60 })
		.withMessage('નામ 60 અક્ષરથી ઓછું રાખો'),
	body('username')
		.trim()
		.isLength({ min: 3, max: 30 })
		.withMessage('યુઝરનેમ 3 થી 30 અક્ષરનું રાખો')
		.matches(USERNAME_REGEX)
		.withMessage('યુઝરનેમમાં ફક્ત અંગ્રેજી અક્ષરો, આંકડા, . અને _ વાપરો'),
	body('password')
		.isLength({ min: 6, max: 64 })
		.withMessage('પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો રાખો'),
	standardIdRule(false),
	body('mobile')
		.optional({ values: 'falsy' })
		.trim()
		.matches(MOBILE_REGEX)
		.withMessage('માન્ય 10 અંકનો મોબાઇલ નંબર લખો'),
	body('schoolName').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
	body('schoolCode').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
	body('avatar').optional().isString().isLength({ max: 30 }),
	body('deviceId').optional().isString().isLength({ max: 200 }),
];

export const loginValidationRules = [
	// Username for students; email or mobile also accepted for staff
	body('username').trim().notEmpty().withMessage('યુઝરનેમ / ઈ-મેલ / મોબાઇલ લખો').isLength({ max: 100 }),
	body('password').notEmpty().withMessage('પાસવર્ડ લખો'),
	body('deviceId').optional().isString().isLength({ max: 200 }),
];

export const refreshTokenValidationRules = [
	body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const updateProfileValidationRules = [
	body('fullName')
		.optional()
		.trim()
		.notEmpty()
		.withMessage('કૃપા કરીને તમારું નામ લખો')
		.isLength({ max: 60 }),
	body('mobile')
		.optional({ values: 'null' })
		.trim()
		.custom((value: string) => value === '' || MOBILE_REGEX.test(value))
		.withMessage('માન્ય 10 અંકનો મોબાઇલ નંબર લખો'),
	standardIdRule(true),
	body('avatar').optional().isString().isLength({ max: 30 }),
];

export const changePasswordValidationRules = [
	body('currentPassword').notEmpty().withMessage('હાલનો પાસવર્ડ લખો'),
	body('newPassword')
		.isLength({ min: 6, max: 64 })
		.withMessage('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો રાખો'),
	body('confirmPassword')
		.custom((value, { req }) => value === req.body.newPassword)
		.withMessage('બંને પાસવર્ડ સરખા નથી'),
];

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export const testListValidation = [
	query('scope').optional().isIn(['live', 'past']),
	query('subjectId').optional().isUUID(),
];

export const submitTestValidation = [
	body('answers').isArray({ max: 200 }).withMessage('જવાબો યાદી સ્વરૂપે હોવા જોઈએ'),
	body('answers.*.questionId').isUUID(),
	body('answers.*.selectedOption').optional({ values: 'null' }).isInt({ min: 0, max: 9 }).toInt(),
];

export const materialListValidation = [
	query('type').optional().isIn(Object.values(MaterialType)),
	query('subjectId').optional().isUUID(),
];

export const checkoutValidation = [
	body('months').isIn(PLAN_MONTHS).withMessage('પ્લાનના મહિના પસંદ કરો').toInt(),
];

export const progressCardValidation = [query('weeks').optional().isInt({ min: 1, max: 52 }).toInt()];

// ---------------------------------------------------------------------------
// Admin - students & staff
// ---------------------------------------------------------------------------

export const studentListValidation = [
	...paginationValidation,
	query('search').optional().trim().isLength({ max: 60 }),
	query('standardId').optional().isInt({ min: 1, max: 10 }).toInt(),
	query('isSchoolStudent').optional().isBoolean().toBoolean(),
	query('isActive').optional().isBoolean().toBoolean(),
];

export const studentUpdateValidation = [
	body('fullName').optional().trim().notEmpty().isLength({ max: 60 }),
	body('mobile')
		.optional({ values: 'null' })
		.trim()
		.custom((value: string) => value === '' || MOBILE_REGEX.test(value))
		.withMessage('માન્ય 10 અંકનો મોબાઇલ નંબર લખો'),
	standardIdRule(true),
	body('isSchoolStudent').optional().isBoolean().toBoolean(),
	body('isActive').optional().isBoolean().toBoolean(),
	body('schoolName').optional({ values: 'null' }).trim().isLength({ max: 100 }),
];

export const resetPasswordValidation = [
	body('password').isLength({ min: 6, max: 64 }).withMessage('પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો રાખો'),
];

export const grantSubscriptionValidation = [
	body('months').isInt({ min: 1, max: 24 }).withMessage('મહિના 1 થી 24 વચ્ચે રાખો').toInt(),
	body('note').optional().trim().isLength({ max: 200 }),
];

const staffContactRules = (optional: boolean) => [
	field('fullName', optional).trim().notEmpty().withMessage('નામ લખો').isLength({ max: 60 }),
	body('email')
		.optional({ values: 'falsy' })
		.trim()
		.isEmail()
		.withMessage('માન્ય ઈ-મેલ લખો')
		.toLowerCase(),
	body('mobile')
		.optional({ values: 'falsy' })
		.trim()
		.matches(MOBILE_REGEX)
		.withMessage('માન્ય 10 અંકનો મોબાઇલ નંબર લખો'),
];

export const createStaffValidation = [
	...staffContactRules(false),
	// Super admins log in with email or mobile - at least one is required
	body('email')
		.custom((value, { req }) => !!(value || req.body.mobile))
		.withMessage('ઈ-મેલ અથવા મોબાઇલ નંબર જરૂરી છે'),
	body('password').isLength({ min: 8, max: 64 }).withMessage('પાસવર્ડ ઓછામાં ઓછો 8 અક્ષરનો રાખો'),
	body('role').optional().isIn([UserRole.ADMIN, UserRole.TEACHER]),
];

export const updateStaffValidation = [
	...staffContactRules(true),
	body('isActive').optional().isBoolean().toBoolean(),
	body('password').optional({ values: 'falsy' }).isLength({ min: 8, max: 64 }).withMessage('પાસવર્ડ ઓછામાં ઓછો 8 અક્ષરનો રાખો'),
];

// ---------------------------------------------------------------------------
// Admin - question bank
// ---------------------------------------------------------------------------

const questionRules = (optional: boolean) => [
	standardIdRule(optional),
	field('subjectId', optional).isUUID().withMessage('વિષય પસંદ કરો'),
	body('chapterId').optional({ values: 'null' }).isUUID().withMessage('અમાન્ય પાઠ'),
	field('text', optional).trim().notEmpty().withMessage('પ્રશ્ન લખો'),
	field('options', optional)
		.isArray({ min: 4, max: 4 })
		.withMessage('બરાબર 4 વિકલ્પ જરૂરી છે'),
	body('options.*').isString().trim().notEmpty().withMessage('કોઈ વિકલ્પ ખાલી ન રાખો'),
	field('correctOption', optional)
		.isInt({ min: 0, max: 3 })
		.withMessage('સાચો વિકલ્પ પસંદ કરો')
		.toInt(),
	body('explanation').optional({ values: 'null' }).trim().isLength({ max: 1000 }),
	body('difficulty').optional().isIn(Object.values(Difficulty)),
];

export const createQuestionValidation = questionRules(false);
export const updateQuestionValidation = questionRules(true);

export const questionListValidation = [
	...paginationValidation,
	query('standardId').optional().isInt({ min: 1, max: 10 }).toInt(),
	query('subjectId').optional().isUUID(),
	query('chapterId').optional().isUUID(),
	query('status').optional().isIn(Object.values(QuestionStatus)),
	query('source').optional().isIn(['MANUAL', 'AI']),
	query('difficulty').optional().isIn(Object.values(Difficulty)),
	query('search').optional().trim().isLength({ max: 100 }),
];

export const generateQuestionsValidation = [
	standardIdRule(false),
	body('subjectId').isUUID().withMessage('વિષય પસંદ કરો'),
	body('chapterId').optional({ values: 'falsy' }).isUUID().withMessage('અમાન્ય પાઠ'),
	body('topic').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
	body('count').isInt({ min: 1, max: 20 }).withMessage('પ્રશ્નોની સંખ્યા 1 થી 20 રાખો').toInt(),
	body('difficulty').isIn(Object.values(Difficulty)),
];

export const reviewQuestionsValidation = [
	body('ids').isArray({ min: 1, max: 100 }).withMessage('ઓછામાં ઓછો એક પ્રશ્ન પસંદ કરો'),
	body('ids.*').isUUID(),
	body('status').isIn([QuestionStatus.APPROVED, QuestionStatus.REJECTED]),
	body('rejectionReason').optional().trim().isLength({ max: 300 }),
];

// ---------------------------------------------------------------------------
// Admin - tests
// ---------------------------------------------------------------------------

const testRules = (optional: boolean) => [
	field('title', optional).trim().notEmpty().withMessage('શીર્ષક લખો').isLength({ max: 120 }),
	body('description').optional().trim().isLength({ max: 500 }),
	standardIdRule(optional),
	field('subjectId', optional).isUUID().withMessage('વિષય પસંદ કરો'),
	field('weekOf', optional).isISO8601().withMessage('અઠવાડિયાની તારીખ પસંદ કરો'),
	body('durationMinutes').optional().isInt({ min: 1, max: 180 }).toInt(),
	body('marksPerQuestion').optional().isInt({ min: 1, max: 10 }).toInt(),
	body('difficulty').optional().isIn(Object.values(Difficulty)),
	body('isPaid').optional().isBoolean().toBoolean(),
	body('status').optional().isIn(Object.values(TestStatus)),
	body('questionIds').optional().isArray({ min: 1, max: 100 }),
	body('questionIds.*').isUUID(),
	body('autoPickCount').optional().isInt({ min: 1, max: 100 }).toInt(),
	body('chapterIds').optional().isArray({ max: 50 }),
	body('chapterIds.*').isUUID(),
];

export const createTestValidation = testRules(false);
export const updateTestValidation = testRules(true);

export const testStatusValidation = [body('status').isIn(Object.values(TestStatus))];

export const adminTestListValidation = [
	...paginationValidation,
	query('standardId').optional().isInt({ min: 1, max: 10 }).toInt(),
	query('subjectId').optional().isUUID(),
	query('status').optional().isIn(Object.values(TestStatus)),
	query('weekOf').optional().isISO8601(),
];

export const resultListValidation = [
	...paginationValidation,
	query('standardId').optional().isInt({ min: 1, max: 10 }).toInt(),
	query('subjectId').optional().isUUID(),
	query('testId').optional().isUUID(),
	query('userId').optional().isUUID(),
	query('weekOf').optional().isISO8601(),
];

// ---------------------------------------------------------------------------
// Admin - content
// ---------------------------------------------------------------------------

const subjectRules = (optional: boolean) => [
	standardIdRule(optional),
	field('name', optional).trim().notEmpty().isLength({ max: 60 }),
	field('nameEn', optional).trim().notEmpty().isLength({ max: 60 }),
	body('description').optional({ values: 'null' }).trim().isLength({ max: 200 }),
	field('icon', optional).trim().notEmpty().isLength({ max: 30 }),
	field('color', optional).matches(HEX_COLOR_REGEX).withMessage('રંગ #1E88E5 જેવા સ્વરૂપે લખો'),
	body('order').optional().isInt({ min: 0 }).toInt(),
	body('isActive').optional().isBoolean().toBoolean(),
];

export const createSubjectValidation = subjectRules(false);
export const updateSubjectValidation = subjectRules(true);

const chapterRules = (optional: boolean) => [
	field('subjectId', optional).isUUID(),
	field('number', optional).isInt({ min: 1, max: 200 }).toInt(),
	field('title', optional).trim().notEmpty().isLength({ max: 120 }),
	body('summary').optional({ values: 'null' }).trim().isLength({ max: 300 }),
	field('content', optional).trim().notEmpty().withMessage('પાઠની વિગત લખો'),
	body('imageUrl').optional({ values: 'null' }).isURL(URL_OPTIONS),
	body('vocabulary').optional({ values: 'null' }).isArray({ max: 200 }),
	body('vocabulary.*.word').isString().trim().notEmpty(),
	body('vocabulary.*.meaning').isString().trim().notEmpty(),
	body('isPublished').optional().isBoolean().toBoolean(),
];

export const createChapterValidation = chapterRules(false);
export const updateChapterValidation = chapterRules(true);

const materialRules = (optional: boolean) => [
	standardIdRule(optional),
	body('subjectId').optional({ values: 'null' }).isUUID(),
	field('title', optional).trim().notEmpty().isLength({ max: 120 }),
	field('type', optional).isIn(Object.values(MaterialType)),
	field('url', optional).isURL(URL_OPTIONS).withMessage('માન્ય લિંક (URL) લખો'),
	body('sizeBytes').optional({ values: 'null' }).isInt({ min: 0 }).toInt(),
	body('isPublished').optional().isBoolean().toBoolean(),
];

export const createMaterialValidation = materialRules(false);
export const updateMaterialValidation = materialRules(true);

const homeworkRules = (optional: boolean) => [
	standardIdRule(optional),
	field('subjectId', optional).isUUID(),
	field('title', optional).trim().notEmpty().isLength({ max: 120 }),
	field('description', optional).trim().notEmpty(),
	field('dueDate', optional).isISO8601().toDate(),
];

export const createHomeworkValidation = homeworkRules(false);
export const updateHomeworkValidation = homeworkRules(true);

const adRules = (optional: boolean) => [
	field('title', optional).trim().notEmpty().isLength({ max: 120 }),
	field('type', optional).isIn(Object.values(AdType)),
	field('imageUrl', optional).isURL(URL_OPTIONS).withMessage('ફોટાની માન્ય લિંક (URL) લખો'),
	body('targetUrl').optional({ values: 'null' }).isURL(URL_OPTIONS),
	body('isActive').optional().isBoolean().toBoolean(),
	body('priority').optional().isInt({ min: 0, max: 100 }).toInt(),
	body('startsAt').optional({ values: 'null' }).isISO8601().toDate(),
	body('endsAt').optional({ values: 'null' }).isISO8601().toDate(),
];

export const createAdValidation = adRules(false);
export const updateAdValidation = adRules(true);

export const standardQueryValidation: ValidationChain[] = [
	query('standardId').isInt({ min: 1, max: 10 }).withMessage('ધોરણ પસંદ કરો').toInt(),
];

export const subjectQueryValidation: ValidationChain[] = [
	query('subjectId').isUUID().withMessage('વિષય પસંદ કરો'),
];
