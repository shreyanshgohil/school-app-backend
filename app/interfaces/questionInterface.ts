import { Difficulty, QuestionStatus } from '../generated/prisma/enums';

export interface QuestionInput {
	standardId: number;
	subjectId: string;
	chapterId?: string | null;
	text: string;
	options: string[];
	correctOption: number;
	explanation?: string | null;
	difficulty?: Difficulty;
}

export type QuestionUpdateInput = Partial<QuestionInput>;

export interface GenerateQuestionsInput {
	standardId: number;
	subjectId: string;
	chapterId?: string;
	topic?: string;
	count: number;
	difficulty: Difficulty;
}

export interface ReviewQuestionsInput {
	ids: string[];
	status: typeof QuestionStatus.APPROVED | typeof QuestionStatus.REJECTED;
	rejectionReason?: string;
}

export interface GeneratedQuestion {
	text: string;
	options: string[];
	correctOption: number;
	explanation: string;
	difficulty: Difficulty;
}
