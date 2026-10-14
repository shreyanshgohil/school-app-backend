import { compact, found, normalize } from '../helpers/mongoHelper';
import { ChapterInput } from '../interfaces/contentInterface';
import {
	Chapter,
	ChapterModel,
	ChapterProgress,
	ChapterProgressModel,
	QuestionModel,
	SUBJECT_SUMMARY_FIELDS,
	SubjectModel,
	SubjectSummary,
} from '../models';

type ChapterWithSubject = Chapter & { subject: SubjectSummary & { standardId: number } };

// An empty list, not null, when the form clears the vocabulary
const withVocabulary = <T extends Partial<ChapterInput>>({ vocabulary, ...data }: T) => ({
	...data,
	vocabulary: vocabulary === null ? [] : vocabulary,
});

class ChapterRepository {
	async getById(id: string) {
		const chapter = await ChapterModel.findById(id)
			.populate({ path: 'subject', select: `${SUBJECT_SUMMARY_FIELDS} standardId` })
			.lean();
		return normalize<ChapterWithSubject | null>(chapter);
	}

	// Ordered list of published chapters in a subject - used for prev / next
	async getSubjectChapterOrder(subjectId: string) {
		const chapters = await ChapterModel.find({ subjectId, isPublished: true })
			.sort({ number: 1 })
			.select('number')
			.lean();
		return normalize<Pick<Chapter, 'id' | 'number'>[]>(chapters);
	}

	async getBySubject(subjectId: string) {
		return normalize<Chapter[]>(await ChapterModel.find({ subjectId }).sort({ number: 1 }).lean());
	}

	async markComplete(userId: string, chapterId: string) {
		const progress = await ChapterProgressModel.findOneAndUpdate(
			{ userId, chapterId },
			{ $setOnInsert: { completedAt: new Date() } },
			{ upsert: true, returnDocument: 'after' }
		).lean();
		return normalize<ChapterProgress>(progress);
	}

	async isCompleted(userId: string, chapterId: string) {
		return !!(await ChapterProgressModel.exists({ userId, chapterId }));
	}

	// Completed chapters with their subject, optionally only inside one subject
	async getCompletedChapterIds(userId: string, subjectId?: string) {
		const progress = await ChapterProgressModel.find({ userId }).select('chapterId').lean();
		const chapters = normalize<Pick<Chapter, 'id' | 'subjectId'>[]>(
			await ChapterModel.find(
				compact({ _id: { $in: progress.map((row) => row.chapterId) }, subjectId })
			)
				.select('subjectId')
				.lean()
		);
		return chapters.map((chapter) => ({ chapterId: chapter.id, chapter: { subjectId: chapter.subjectId } }));
	}

	async countPublishedForStandard(standardId: number) {
		const subjectIds = await SubjectModel.find({ standardId, isActive: true }).distinct('_id');
		return ChapterModel.countDocuments({ isPublished: true, subjectId: { $in: subjectIds } });
	}

	async countCompletedForStandard(userId: string, standardId: number) {
		const [subjectIds, chapterIds] = await Promise.all([
			SubjectModel.find({ standardId }).distinct('_id'),
			ChapterProgressModel.find({ userId }).distinct('chapterId'),
		]);
		return ChapterModel.countDocuments({
			_id: { $in: chapterIds },
			isPublished: true,
			subjectId: { $in: subjectIds },
		});
	}

	async create(data: ChapterInput) {
		const chapter = await ChapterModel.create(withVocabulary(data));
		return normalize<Chapter>(chapter.toObject());
	}

	async update(id: string, data: Partial<ChapterInput>) {
		const chapter = await ChapterModel.findByIdAndUpdate(
			id,
			{ $set: compact(withVocabulary(data)) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Chapter>(found(chapter));
	}

	// Progress goes with the chapter; its questions stay in the bank without a chapter
	async delete(id: string) {
		const chapter = found(await ChapterModel.findByIdAndDelete(id).lean());
		await Promise.all([
			ChapterProgressModel.deleteMany({ chapterId: id }),
			QuestionModel.updateMany({ chapterId: id }, { $set: { chapterId: null } }),
		]);
		return normalize<Chapter>(chapter);
	}
}

export default new ChapterRepository();
