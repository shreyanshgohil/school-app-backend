import { Types } from 'mongoose';
import { compact, found, normalize, toObjectId } from '../helpers/mongoHelper';
import { SubjectInput } from '../interfaces/contentInterface';
import { Chapter, ChapterModel, Subject, SUBJECT_SUMMARY_FIELDS, SubjectModel, SubjectSummary } from '../models';

// Summary + `order`, for lists that sort by the subject's position
export const SUBJECT_SORT_FIELDS = `${SUBJECT_SUMMARY_FIELDS} order`;
export type SortableSubject = SubjectSummary & { order: number };
export const toSubjectSummary = ({ order: _order, ...subject }: SortableSubject): SubjectSummary => subject;

class SubjectRepository {
	async getByStandard(standardId: number, includeInactive = false) {
		const subjects = normalize<Subject[]>(
			await SubjectModel.find({ standardId, ...(includeInactive ? {} : { isActive: true }) })
				.sort({ order: 1 })
				.lean()
		);

		// Published chapters per subject
		const counts = await ChapterModel.aggregate<{ _id: Types.ObjectId; count: number }>([
			{ $match: { subjectId: { $in: subjects.map((subject) => toObjectId(subject.id)) }, isPublished: true } },
			{ $group: { _id: '$subjectId', count: { $sum: 1 } } },
		]);
		const countById = new Map(counts.map((row) => [row._id.toString(), row.count]));

		return subjects.map((subject) => ({
			...subject,
			_count: { chapters: countById.get(subject.id) ?? 0 },
		}));
	}

	async getById(id: string) {
		return normalize<Subject | null>(await SubjectModel.findById(id).lean());
	}

	async getWithChapters(id: string) {
		const subject = await this.getById(id);
		if (!subject) return null;

		const chapters = await ChapterModel.find({ subjectId: id, isPublished: true })
			.sort({ number: 1 })
			.select('number title summary')
			.lean();
		return {
			...subject,
			chapters: normalize<Pick<Chapter, 'id' | 'number' | 'title' | 'summary'>[]>(chapters),
		};
	}

	async create(data: SubjectInput) {
		const subject = await SubjectModel.create(data);
		return normalize<Subject>(subject.toObject());
	}

	async update(id: string, data: Partial<SubjectInput>) {
		const subject = await SubjectModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Subject>(found(subject));
	}
}

export default new SubjectRepository();
