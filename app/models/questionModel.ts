import { model, Schema } from 'mongoose';
import { Difficulty, QuestionSource, QuestionStatus } from '../enum';

export interface Question {
	id: string;
	standardId: number;
	subjectId: string;
	chapterId: string | null;
	text: string;
	// Always 4 options
	options: string[];
	correctOption: number;
	explanation: string | null;
	difficulty: Difficulty;
	source: QuestionSource;
	// AI questions start PENDING and are only usable after an admin approves them
	status: QuestionStatus;
	rejectionReason: string | null;
	createdById: string | null;
	reviewedById: string | null;
	reviewedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const questionSchema = new Schema(
	{
		standardId: { type: Number, ref: 'Standard', required: true },
		subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
		chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', default: null, index: true },
		text: { type: String, required: true },
		options: { type: [String], required: true },
		correctOption: { type: Number, required: true },
		explanation: { type: String, default: null },
		difficulty: { type: String, enum: Object.values(Difficulty), default: Difficulty.MEDIUM },
		source: { type: String, enum: Object.values(QuestionSource), default: QuestionSource.MANUAL },
		status: { type: String, enum: Object.values(QuestionStatus), default: QuestionStatus.PENDING },
		rejectionReason: { type: String, default: null },
		createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
		reviewedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
		reviewedAt: { type: Date, default: null },
	},
	{ timestamps: true, versionKey: false }
);

questionSchema.index({ standardId: 1, subjectId: 1, status: 1 });

questionSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
questionSchema.virtual('chapter', { ref: 'Chapter', localField: 'chapterId', foreignField: '_id', justOne: true });
questionSchema.virtual('createdBy', { ref: 'User', localField: 'createdById', foreignField: '_id', justOne: true });
questionSchema.virtual('reviewedBy', { ref: 'User', localField: 'reviewedById', foreignField: '_id', justOne: true });

export const QuestionModel = model('Question', questionSchema);
