import { MaterialType } from '../enum';
import { compact, found, normalize } from '../helpers/mongoHelper';
import { MaterialInput } from '../interfaces/contentInterface';
import { StudyMaterial, StudyMaterialModel, SubjectSummary } from '../models';
import { SortableSubject, SUBJECT_SORT_FIELDS, toSubjectSummary } from './subjectRepository';

class MaterialRepository {
	// Grouped by subject position (general material last), newest first inside a subject
	async getForStandard(
		standardId: number,
		filters: { type?: MaterialType; subjectId?: string; includeUnpublished?: boolean }
	) {
		const materials = normalize<(StudyMaterial & { subject: SortableSubject | null })[]>(
			await StudyMaterialModel.find(
				compact({
					standardId,
					type: filters.type,
					subjectId: filters.subjectId,
					isPublished: filters.includeUnpublished ? undefined : true,
				})
			)
				.sort({ createdAt: -1 })
				.populate({ path: 'subject', select: SUBJECT_SORT_FIELDS })
				.lean()
		);

		const position = (material: (typeof materials)[number]) => material.subject?.order ?? Number.MAX_SAFE_INTEGER;
		return materials
			.sort((a, b) => position(a) - position(b))
			.map((material) => ({
				...material,
				subject: material.subject ? toSubjectSummary(material.subject) : null,
			})) satisfies (StudyMaterial & { subject: SubjectSummary | null })[];
	}

	async getById(id: string) {
		return normalize<StudyMaterial | null>(await StudyMaterialModel.findById(id).lean());
	}

	async create(data: MaterialInput) {
		const material = await StudyMaterialModel.create(data);
		return normalize<StudyMaterial>(material.toObject());
	}

	async update(id: string, data: Partial<MaterialInput>) {
		const material = await StudyMaterialModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<StudyMaterial>(found(material));
	}

	async delete(id: string) {
		return normalize<StudyMaterial>(found(await StudyMaterialModel.findByIdAndDelete(id).lean()));
	}
}

export default new MaterialRepository();
