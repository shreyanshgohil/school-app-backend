import { model, Schema } from 'mongoose';

export interface Homework {
	id: string;
	standardId: number;
	subjectId: string;
	title: string;
	description: string;
	dueDate: Date;
	createdAt: Date;
	updatedAt: Date;
}

const homeworkSchema = new Schema(
	{
		standardId: { type: Number, ref: 'Standard', required: true },
		subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
		title: { type: String, required: true },
		description: { type: String, required: true },
		dueDate: { type: Date, required: true },
	},
	{ timestamps: true, versionKey: false }
);

homeworkSchema.index({ standardId: 1, dueDate: 1 });

homeworkSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });

export const HomeworkModel = model('Homework', homeworkSchema, 'homework');
