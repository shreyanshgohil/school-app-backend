import { model, Schema } from 'mongoose';

export interface Vocabulary {
	word: string;
	meaning: string;
}

export interface Chapter {
	id: string;
	subjectId: string;
	number: number;
	title: string;
	summary: string | null;
	content: string;
	imageUrl: string | null;
	vocabulary: Vocabulary[];
	isPublished: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const chapterSchema = new Schema(
	{
		subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
		number: { type: Number, required: true },
		title: { type: String, required: true },
		summary: { type: String, default: null },
		content: { type: String, required: true },
		imageUrl: { type: String, default: null },
		vocabulary: { type: [{ _id: false, word: String, meaning: String }], default: [] },
		isPublished: { type: Boolean, default: true },
	},
	{ timestamps: true, versionKey: false }
);

chapterSchema.index({ subjectId: 1, number: 1 }, { unique: true });

chapterSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });

export const ChapterModel = model('Chapter', chapterSchema);
