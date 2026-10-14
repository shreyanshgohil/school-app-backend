import { model, Schema } from 'mongoose';

export interface Subject {
	id: string;
	standardId: number;
	name: string;
	nameEn: string;
	description: string | null;
	// Icon key understood by the app (e.g. "book", "calculator", "flask")
	icon: string;
	color: string;
	order: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// What lists and cards show about a subject
export type SubjectSummary = Pick<Subject, 'id' | 'name' | 'nameEn' | 'icon' | 'color'>;
export const SUBJECT_SUMMARY_FIELDS = 'name nameEn icon color';

const subjectSchema = new Schema(
	{
		standardId: { type: Number, ref: 'Standard', required: true },
		name: { type: String, required: true },
		nameEn: { type: String, required: true },
		description: { type: String, default: null },
		icon: { type: String, required: true },
		color: { type: String, required: true },
		order: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true, versionKey: false }
);

subjectSchema.index({ standardId: 1, nameEn: 1 }, { unique: true });

export const SubjectModel = model('Subject', subjectSchema);
