import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import config from '../../config';
import { getAnthropicClient } from '../client/anthropic';
import { Difficulty } from '../generated/prisma/enums';
import { GeneratedQuestion } from '../interfaces/questionInterface';
import { CustomError } from '../models/customError';

const GeneratedQuestionsSchema = z.object({
	questions: z.array(
		z.object({
			text: z.string(),
			options: z.array(z.string()),
			correctOption: z.number().int(),
			explanation: z.string(),
			difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
		})
	),
});

const SYSTEM_PROMPT = `You write multiple-choice questions for weekly school tests in the Shala Sangathi app.
The students study in Gujarat Board (GSEB), Gujarati medium, standards 1 to 10. A teacher reviews every question before students see it.

Requirements for every question:
- Exactly 4 options, exactly one of them correct, all 4 distinct and plausible. Do not use "all of the above" or "none of the above".
- correctOption is the 0-based index of the correct option. Vary its position across questions.
- Write in Gujarati script. For the English subject, write the question and options in English and the explanation in simple Gujarati. Mathematical expressions may use digits and symbols.
- Match the reading level and syllabus of the given standard. Keep sentences short and clear for children.
- The question must be answerable from text alone - no diagrams, images or tables.
- explanation: one or two short Gujarati sentences on why the answer is correct.
- difficulty: EASY, MEDIUM or HARD, matching the requested level.
- Stay strictly within the provided chapter text or topic when one is given. Never repeat or paraphrase the listed existing questions.`;

interface GenerateContext {
	standardName: string;
	subjectName: string;
	subjectNameEn: string;
	chapterTitle?: string;
	chapterContent?: string;
	topic?: string;
	count: number;
	difficulty: Difficulty;
	existingQuestions: string[];
}

const buildUserPrompt = (context: GenerateContext) => {
	const parts = [
		`Standard: ${context.standardName}`,
		`Subject: ${context.subjectName} (${context.subjectNameEn})`,
		`Difficulty: ${context.difficulty}`,
		`Number of questions: ${context.count}`,
	];
	if (context.chapterTitle) parts.push(`Chapter: ${context.chapterTitle}`);
	if (context.topic) parts.push(`Topic focus: ${context.topic}`);
	if (context.chapterContent) {
		parts.push(`<chapter_text>\n${context.chapterContent}\n</chapter_text>`);
	}
	if (context.existingQuestions.length) {
		parts.push(
			`<existing_questions>\n${context.existingQuestions.map((text) => `- ${text}`).join('\n')}\n</existing_questions>`
		);
	}
	parts.push(`Write ${context.count} new questions.`);
	return parts.join('\n\n');
};

// The schema cannot express "exactly 4 options" or index bounds, so check here
const isUsable = (question: GeneratedQuestion) => {
	const options = question.options.map((option) => option.trim());
	return (
		question.text.trim().length > 0 &&
		options.length === 4 &&
		options.every((option) => option.length > 0) &&
		new Set(options).size === 4 &&
		question.correctOption >= 0 &&
		question.correctOption < 4
	);
};

class AiQuestionServices {
	async generate(context: GenerateContext): Promise<GeneratedQuestion[]> {
		const client = getAnthropicClient();

		let response;
		try {
			response = await client.beta.messages.parse({
				model: config.aiQuestionModel,
				max_tokens: 16000,
				// On a safety decline the API retries on Anthropic's recommended fallback model
				betas: ['server-side-fallback-2026-07-01'],
				fallbacks: 'default',
				output_config: {
					effort: 'high',
					format: betaZodOutputFormat(GeneratedQuestionsSchema),
				},
				system: SYSTEM_PROMPT,
				messages: [{ role: 'user', content: buildUserPrompt(context) }],
			});
		} catch (err) {
			if (err instanceof Anthropic.AuthenticationError) {
				throw new CustomError(503, 'AI પ્રશ્નો માટે API key સેટ નથી (ANTHROPIC_API_KEY)');
			}
			if (err instanceof Anthropic.RateLimitError) {
				throw new CustomError(429, 'AI સેવા વ્યસ્ત છે, એક મિનિટ પછી ફરી પ્રયત્ન કરો');
			}
			if (err instanceof Anthropic.APIConnectionError) {
				throw new CustomError(503, 'AI સેવા સાથે જોડાણ થયું નહીં, ફરી પ્રયત્ન કરો');
			}
			if (err instanceof Anthropic.APIError) {
				console.error('AI question generation failed:', err.status, err.message);
				throw new CustomError(502, 'AI પ્રશ્નો બની શક્યા નહીં, ફરી પ્રયત્ન કરો');
			}
			// The SDK throws a plain Error before sending when no credentials are configured
			console.error('AI question generation failed:', err);
			throw new CustomError(503, 'AI પ્રશ્નો માટે API key સેટ નથી (ANTHROPIC_API_KEY)');
		}

		if (response.stop_reason === 'refusal') {
			throw new CustomError(422, 'AI એ આ વિનંતી નકારી - બીજો વિષય કે પાઠ અજમાવો');
		}
		if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
			throw new CustomError(502, 'AI નો જવાબ અધૂરો આવ્યો - ઓછા પ્રશ્નો માંગો');
		}

		const questions = response.parsed_output.questions
			.map((question) => ({
				...question,
				text: question.text.trim(),
				options: question.options.map((option) => option.trim()),
				explanation: question.explanation.trim(),
				difficulty: question.difficulty as Difficulty,
			}))
			.filter(isUsable);

		if (!questions.length) {
			throw new CustomError(502, 'AI એ યોગ્ય પ્રશ્નો આપ્યા નથી, ફરી પ્રયત્ન કરો');
		}
		return questions.slice(0, context.count);
	}
}

export default new AiQuestionServices();
