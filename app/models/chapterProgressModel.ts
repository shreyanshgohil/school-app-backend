import { model, Schema } from 'mongoose';

// A chapter the student marked as read
export interface ChapterProgress {
	id: string;
	userId: string;
	chapterId: string;
	completedAt: Date;
}

const chapterProgressSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true, index: true },
		completedAt: { type: Date, default: Date.now },
	},
	{ versionKey: false }
);

chapterProgressSchema.index({ userId: 1, chapterId: 1 }, { unique: true });

export const ChapterProgressModel = model('ChapterProgress', chapterProgressSchema, 'chapter_progress');
