import { model, Schema } from 'mongoose';

// One attempt per student per test. Created when the student starts the test so
// the timer is enforced on the server; graded on submit.
export interface TestAttempt {
	id: string;
	userId: string;
	testId: string;
	// { [questionId]: selectedOption | null }
	answers: Record<string, number | null> | null;
	score: number;
	totalMarks: number;
	correctCount: number;
	wrongCount: number;
	skippedCount: number;
	percentage: number;
	startedAt: Date;
	submittedAt: Date | null;
	timeTakenSeconds: number | null;
}

const testAttemptSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
		answers: { type: Schema.Types.Mixed, default: null },
		score: { type: Number, default: 0 },
		totalMarks: { type: Number, default: 0 },
		correctCount: { type: Number, default: 0 },
		wrongCount: { type: Number, default: 0 },
		skippedCount: { type: Number, default: 0 },
		percentage: { type: Number, default: 0 },
		startedAt: { type: Date, default: Date.now },
		submittedAt: { type: Date, default: null },
		timeTakenSeconds: { type: Number, default: null },
	},
	{ versionKey: false }
);

testAttemptSchema.index({ userId: 1, testId: 1 }, { unique: true });
testAttemptSchema.index({ submittedAt: -1 });

testAttemptSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
testAttemptSchema.virtual('test', { ref: 'Test', localField: 'testId', foreignField: '_id', justOne: true });

export const TestAttemptModel = model('TestAttempt', testAttemptSchema, 'test_attempts');
