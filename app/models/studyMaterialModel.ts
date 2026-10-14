import { model, Schema } from 'mongoose';
import { MaterialType } from '../enum';

export interface StudyMaterial {
	id: string;
	standardId: number;
	subjectId: string | null;
	title: string;
	type: MaterialType;
	url: string;
	sizeBytes: number | null;
	isPublished: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const studyMaterialSchema = new Schema(
	{
		standardId: { type: Number, ref: 'Standard', required: true },
		subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
		title: { type: String, required: true },
		type: { type: String, enum: Object.values(MaterialType), required: true },
		url: { type: String, required: true },
		sizeBytes: { type: Number, default: null },
		isPublished: { type: Boolean, default: true },
	},
	{ timestamps: true, versionKey: false }
);

studyMaterialSchema.index({ standardId: 1, type: 1 });

studyMaterialSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });

export const StudyMaterialModel = model('StudyMaterial', studyMaterialSchema, 'study_materials');
