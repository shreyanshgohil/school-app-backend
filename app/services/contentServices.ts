import { ChapterInput, HomeworkInput, MaterialInput, SubjectInput } from '../interfaces/contentInterface';
import { MaterialType } from '../enum';
import { CustomError } from '../models/customError';
import {
	chapterRepository,
	homeworkRepository,
	materialRepository,
	subjectRepository,
} from '../repositories';
import userServices from './userServices';

// Study material, homework and curriculum content
class ContentServices {
	async getStudentMaterials(userId: string, filters: { type?: MaterialType; subjectId?: string }) {
		const student = await userServices.getStudentOrThrow(userId);
		return materialRepository.getForStandard(student.standardId, filters);
	}

	async getStudentHomework(userId: string) {
		const student = await userServices.getStudentOrThrow(userId);
		// Keep homework visible for a day after its due date
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
		return homeworkRepository.getForStandard(student.standardId, since);
	}

	// ----- Admin -----

	private async assertSubjectInStandard(subjectId: string, standardId: number) {
		const subject = await subjectRepository.getById(subjectId);
		if (!subject || subject.standardId !== standardId) {
			throw new CustomError(400, 'આ વિષય પસંદ કરેલા ધોરણનો નથી');
		}
	}

	async getSubjects(standardId: number) {
		return subjectRepository.getByStandard(standardId, true);
	}

	async createSubject(data: SubjectInput) {
		return subjectRepository.create(data);
	}

	async updateSubject(id: string, data: Partial<SubjectInput>) {
		return subjectRepository.update(id, data);
	}

	async getChapters(subjectId: string) {
		return chapterRepository.getBySubject(subjectId);
	}

	private found<T>(item: T | null, message: string) {
		if (!item) throw new CustomError(404, message);
		return item;
	}

	async getChapter(id: string) {
		return this.found(await chapterRepository.getById(id), 'પાઠ મળ્યો નથી');
	}

	async getMaterial(id: string) {
		return this.found(await materialRepository.getById(id), 'સામગ્રી મળી નથી');
	}

	async getHomeworkById(id: string) {
		return this.found(await homeworkRepository.getById(id), 'હોમવર્ક મળ્યું નથી');
	}

	async createChapter(data: ChapterInput) {
		const subject = await subjectRepository.getById(data.subjectId);
		if (!subject) {
			throw new CustomError(400, 'વિષય મળ્યો નથી');
		}
		return chapterRepository.create(data);
	}

	async updateChapter(id: string, data: Partial<ChapterInput>) {
		return chapterRepository.update(id, data);
	}

	async deleteChapter(id: string) {
		return chapterRepository.delete(id);
	}

	async getMaterials(standardId: number, filters: { type?: MaterialType; subjectId?: string }) {
		return materialRepository.getForStandard(standardId, { ...filters, includeUnpublished: true });
	}

	async createMaterial(data: MaterialInput) {
		if (data.subjectId) {
			await this.assertSubjectInStandard(data.subjectId, data.standardId);
		}
		return materialRepository.create(data);
	}

	async updateMaterial(id: string, data: Partial<MaterialInput>) {
		return materialRepository.update(id, data);
	}

	async deleteMaterial(id: string) {
		return materialRepository.delete(id);
	}

	async getHomework(standardId: number) {
		return homeworkRepository.getForStandard(standardId);
	}

	async createHomework(data: HomeworkInput) {
		await this.assertSubjectInStandard(data.subjectId, data.standardId);
		return homeworkRepository.create(data);
	}

	async updateHomework(id: string, data: Partial<HomeworkInput>) {
		return homeworkRepository.update(id, data);
	}

	async deleteHomework(id: string) {
		return homeworkRepository.delete(id);
	}
}

export default new ContentServices();
