import { model, Schema } from 'mongoose';
import { Difficulty, TestStatus } from '../enum';

export interface Test {
	id: string;
	title: string;
	description: string | null;
	standardId: number;
	subjectId: string;
	// Monday 00:00 IST of the week the test is live, and the following Monday
	weekStart: Date;
	weekEnd: Date;
	durationMinutes: number;
	marksPerQuestion: number;
	difficulty: Difficulty;
	isPaid: boolean;
	status: TestStatus;
	createdById: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// The question list lives inside the test, in test order
export interface TestQuestionRef {
	questionId: string;
	order: number;
}

const testSchema = new Schema(
	{
		title: { type: String, required: true },
		description: { type: String, default: null },
		standardId: { type: Number, ref: 'Standard', required: true },
		subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
		weekStart: { type: Date, required: true },
		weekEnd: { type: Date, required: true },
		durationMinutes: { type: Number, default: 10 },
		marksPerQuestion: { type: Number, default: 1 },
		difficulty: { type: String, enum: Object.values(Difficulty), default: Difficulty.MEDIUM },
		isPaid: { type: Boolean, default: false },
		status: { type: String, enum: Object.values(TestStatus), default: TestStatus.DRAFT },
		createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
		questions: {
			type: [
				{
					_id: false,
					questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
					order: { type: Number, required: true },
				},
			],
			default: [],
		},
	},
	{ timestamps: true, versionKey: false }
);

testSchema.index({ standardId: 1, weekStart: -1, status: 1 });
testSchema.index({ 'questions.questionId': 1 });

testSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });

export const TestModel = model('Test', testSchema);
