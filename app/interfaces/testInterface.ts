import { Difficulty, TestStatus } from '../enum';

export interface AnswerInput {
	questionId: string;
	selectedOption: number | null;
}

export interface TestInput {
	title: string;
	description?: string;
	standardId: number;
	subjectId: string;
	// Any date inside the target week; normalised to Monday 00:00 IST
	weekOf: string;
	durationMinutes?: number;
	marksPerQuestion?: number;
	difficulty?: Difficulty;
	isPaid?: boolean;
	status?: TestStatus;
	// Either pick questions explicitly...
	questionIds?: string[];
	// ...or let the system pick approved questions at random
	autoPickCount?: number;
	chapterIds?: string[];
}

export type TestUpdateInput = Partial<TestInput>;

export type TestScope = 'live' | 'past';

export type StudentTestStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
