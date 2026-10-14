import { compact, found, normalize } from '../helpers/mongoHelper';
import { HomeworkInput } from '../interfaces/contentInterface';
import { Homework, HomeworkModel, SUBJECT_SUMMARY_FIELDS, SubjectSummary } from '../models';

class HomeworkRepository {
	// Homework due from `since` onwards, nearest due date first
	async getForStandard(standardId: number, since?: Date) {
		const homework = await HomeworkModel.find({ standardId, ...(since ? { dueDate: { $gte: since } } : {}) })
			.sort({ dueDate: 1 })
			.populate({ path: 'subject', select: SUBJECT_SUMMARY_FIELDS })
			.lean();
		return normalize<(Homework & { subject: SubjectSummary })[]>(homework);
	}

	async getById(id: string) {
		return normalize<Homework | null>(await HomeworkModel.findById(id).lean());
	}

	async create(data: HomeworkInput) {
		const homework = await HomeworkModel.create(data);
		return normalize<Homework>(homework.toObject());
	}

	async update(id: string, data: Partial<HomeworkInput>) {
		const homework = await HomeworkModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Homework>(found(homework));
	}

	async delete(id: string) {
		return normalize<Homework>(found(await HomeworkModel.findByIdAndDelete(id).lean()));
	}
}

export default new HomeworkRepository();
