import { AdType, MaterialType } from '../enum';
import { Vocabulary } from '../models/chapterModel';

export interface SubjectInput {
	standardId: number;
	name: string;
	nameEn: string;
	description?: string | null;
	icon: string;
	color: string;
	order?: number;
	isActive?: boolean;
}

export interface ChapterInput {
	subjectId: string;
	number: number;
	title: string;
	summary?: string | null;
	content: string;
	imageUrl?: string | null;
	vocabulary?: Vocabulary[] | null;
	isPublished?: boolean;
}

export interface MaterialInput {
	standardId: number;
	subjectId?: string | null;
	title: string;
	type: MaterialType;
	url: string;
	sizeBytes?: number | null;
	isPublished?: boolean;
}

export interface HomeworkInput {
	standardId: number;
	subjectId: string;
	title: string;
	description: string;
	dueDate: Date;
}

export interface AdInput {
	title: string;
	type: AdType;
	imageUrl: string;
	targetUrl?: string | null;
	isActive?: boolean;
	priority?: number;
	startsAt?: Date | null;
	endsAt?: Date | null;
}
