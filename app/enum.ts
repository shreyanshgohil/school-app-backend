// Shared enums (stored as strings in MongoDB)

export const UserRole = { STUDENT: 'STUDENT', TEACHER: 'TEACHER', ADMIN: 'ADMIN' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SubscriptionStatus = { ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED', CANCELLED: 'CANCELLED' } as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentStatus = { CREATED: 'CREATED', PAID: 'PAID', EXPIRED: 'EXPIRED', CANCELLED: 'CANCELLED' } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const MaterialType = { NOTE: 'NOTE', PDF: 'PDF', VIDEO: 'VIDEO' } as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

export const Difficulty = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const QuestionSource = { MANUAL: 'MANUAL', AI: 'AI' } as const;
export type QuestionSource = (typeof QuestionSource)[keyof typeof QuestionSource];

export const QuestionStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' } as const;
export type QuestionStatus = (typeof QuestionStatus)[keyof typeof QuestionStatus];

export const TestStatus = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' } as const;
export type TestStatus = (typeof TestStatus)[keyof typeof TestStatus];

export const AdType = { BANNER: 'BANNER', INTERSTITIAL: 'INTERSTITIAL' } as const;
export type AdType = (typeof AdType)[keyof typeof AdType];
