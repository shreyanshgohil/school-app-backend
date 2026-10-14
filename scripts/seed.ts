/* Development seed: standards 1-10 with subjects, plus sample Std 5 content,
 * weekly tests, past results, a demo admin and demo students.
 * Run with: npm run db:seed (safe to run more than once). */
import { connectDatabase, disconnectDatabase } from '../app/config/db';
import {
	AdType,
	Difficulty,
	MaterialType,
	QuestionSource,
	QuestionStatus,
	TestStatus,
	UserRole,
} from '../app/enum';
import { getWeekRange, getWeekStartWeeksAgo } from '../app/helpers/dateHelper';
import { toPercentage } from '../app/helpers/gradeHelper';
import { hashPassword } from '../app/helpers/passwordHelper';
import {
	AdModel,
	ChapterModel,
	ChapterProgressModel,
	HomeworkModel,
	QuestionModel,
	StandardModel,
	StudyMaterialModel,
	SubjectModel,
	TestAttemptModel,
	TestModel,
	UserModel,
} from '../app/models';

const requireEnv = (name: string) => {
	const value = process.env[name];
	if (!value) throw new Error(`Set ${name} in .env before seeding (see .env.example)`);
	return value;
};

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

type SubjectKey = 'gujarati' | 'maths' | 'science' | 'social' | 'english' | 'hindi' | 'sanskrit' | 'gk';

const SUBJECTS: Record<
	SubjectKey,
	{ name: string; nameEn: string; description: string; icon: string; color: string }
> = {
	gujarati: { name: 'ગુજરાતી', nameEn: 'Gujarati', description: 'ભાષા - આપણી ઓળખ', icon: 'book', color: '#F57C00' },
	maths: { name: 'ગણિત', nameEn: 'Mathematics', description: 'આંકડાની મજેદાર દુનિયા', icon: 'calculator', color: '#1E88E5' },
	science: { name: 'વિજ્ઞાન', nameEn: 'Science', description: 'પ્રયોગ અને શોધ', icon: 'flask', color: '#43A047' },
	social: { name: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', description: 'આપણો સમાજ અને દેશ', icon: 'globe', color: '#8E24AA' },
	english: { name: 'અંગ્રેજી', nameEn: 'English', description: 'Learn English with fun', icon: 'alphabet', color: '#E91E63' },
	hindi: { name: 'હિન્દી', nameEn: 'Hindi', description: 'राष्ट्रभाषा हिंदी', icon: 'translate', color: '#6D4C41' },
	sanskrit: { name: 'સંસ્કૃત', nameEn: 'Sanskrit', description: 'દેવભાષા સંસ્કૃત', icon: 'scroll', color: '#5E35B1' },
	gk: { name: 'સામાન્ય જ્ઞાન', nameEn: 'General Knowledge', description: 'જાણો અને જીતો', icon: 'star', color: '#00ACC1' },
};

const subjectsForStandard = (standard: number): SubjectKey[] => {
	if (standard <= 2) return ['gujarati', 'maths', 'english', 'gk'];
	if (standard <= 5) return ['gujarati', 'maths', 'science', 'social', 'english', 'gk'];
	return ['gujarati', 'maths', 'science', 'social', 'english', 'hindi', 'sanskrit', 'gk'];
};

// ---------------------------------------------------------------------------
// Std 5 sample content
// ---------------------------------------------------------------------------

interface SeedChapter {
	title: string;
	summary: string;
	content: string;
	vocabulary: { word: string; meaning: string }[];
}

// [text, options, correctOption, chapterNumber | null, explanation]
type SeedQuestion = [string, string[], number, number | null, string];

const STD5: Partial<Record<SubjectKey, { chapters: SeedChapter[]; questions: SeedQuestion[] }>> = {
	gujarati: {
		chapters: [
			{
				title: 'મારું ગામ',
				summary: 'ગામનું સુંદર અને શાંત જીવન',
				content:
					'મારું ગામ ખૂબ સુંદર છે. ગામની ચારે બાજુ લીલાં ખેતરો છે. અહીંના લોકો સાદા અને મહેનતુ છે. સવારે ખેડૂતો બળદ લઈને ખેતરે જાય છે.\n\nગામની વચ્ચે એક મોટું તળાવ છે અને તેની પાસે વડનું ઘટાદાર ઝાડ છે. સાંજે બાળકો વડ નીચે રમે છે અને વડીલો ઓટલે બેસીને વાતો કરે છે.\n\nગામમાં હરિયાળી, સફાઈ અને શાંતિ છે. મને મારું ગામ ખૂબ ગમે છે.',
				vocabulary: [
					{ word: 'હરિયાળી', meaning: 'લીલોતરી' },
					{ word: 'મહેનતુ', meaning: 'ખૂબ મહેનત કરનાર' },
					{ word: 'વડીલ', meaning: 'ઉંમરમાં મોટી વ્યક્તિ' },
					{ word: 'ઓટલો', meaning: 'ઘરની આગળનો ઊંચો ભાગ' },
				],
			},
			{
				title: 'વૃક્ષો આપણા મિત્ર',
				summary: 'વૃક્ષોનું મહત્વ અને જતન',
				content:
					'વૃક્ષો આપણા સાચા મિત્ર છે. તે આપણને શુદ્ધ હવા, છાંયો, ફળ અને લાકડું આપે છે. વૃક્ષો પર પક્ષીઓ માળા બાંધે છે.\n\nવૃક્ષો વરસાદ લાવવામાં મદદ કરે છે અને જમીનનું ધોવાણ અટકાવે છે. તેથી આપણે વૃક્ષો કાપવાં ન જોઈએ.\n\nદરેક બાળકે વર્ષમાં ઓછામાં ઓછું એક વૃક્ષ વાવવું જોઈએ અને તેનું જતન કરવું જોઈએ.',
				vocabulary: [
					{ word: 'છાંયો', meaning: 'તડકાથી બચાવતી છાયા' },
					{ word: 'ધોવાણ', meaning: 'પાણીથી માટી વહી જવી' },
					{ word: 'જતન', meaning: 'કાળજી' },
				],
			},
			{
				title: 'મહેનતનું ફળ',
				summary: 'મહેનતુ રામુ અને આળસુ શામુની વાર્તા',
				content:
					'એક ગામમાં રામુ નામનો ખેડૂત રહેતો હતો. તે રોજ વહેલી સવારે ઊઠીને ખેતરમાં કામ કરતો. તેનો પડોશી શામુ આળસુ હતો અને આખો દિવસ સૂઈ રહેતો.\n\nચોમાસું આવ્યું ત્યારે રામુએ સમયસર વાવણી કરી. થોડા મહિનામાં રામુનું ખેતર પાકથી લહેરાવા લાગ્યું, જ્યારે શામુનું ખેતર સૂકું રહ્યું.\n\nશામુને સમજાયું કે મહેનતનું ફળ હંમેશાં મીઠું હોય છે.',
				vocabulary: [
					{ word: 'આળસુ', meaning: 'કામ ન કરનાર' },
					{ word: 'વાવણી', meaning: 'ખેતરમાં બી વાવવાનું કામ' },
					{ word: 'પાક', meaning: 'ખેતરમાં ઊગતું અનાજ' },
				],
			},
			{
				title: 'સ્વચ્છ ભારત',
				summary: 'સ્વચ્છતા એ સારા સ્વાસ્થ્યની ચાવી',
				content:
					'સ્વચ્છતા એ સારા સ્વાસ્થ્યની ચાવી છે. આપણે ઘર, શાળા અને રસ્તા સાફ રાખવા જોઈએ. કચરો હંમેશાં કચરાપેટીમાં જ નાખવો જોઈએ.\n\nસૂકો અને ભીનો કચરો અલગ રાખવો જોઈએ. જમતાં પહેલાં અને શૌચાલયના ઉપયોગ પછી સાબુથી હાથ ધોવા જોઈએ.\n\nજો દરેક નાગરિક પોતાની જવાબદારી સમજે તો આપણો દેશ સ્વચ્છ અને સુંદર બની શકે.',
				vocabulary: [
					{ word: 'સ્વચ્છતા', meaning: 'સફાઈ' },
					{ word: 'સ્વાસ્થ્ય', meaning: 'તંદુરસ્તી' },
					{ word: 'નાગરિક', meaning: 'દેશમાં રહેતી વ્યક્તિ' },
				],
			},
			{
				title: 'ચાંદો',
				summary: 'રાતના આકાશનો ચમકતો મિત્ર',
				content:
					'રાત્રે આકાશમાં ચાંદો ચમકે છે. ચાંદો પોતાનો પ્રકાશ ધરાવતો નથી, તે સૂર્યના પ્રકાશથી ચમકે છે. ચાંદો પૃથ્વીની આસપાસ ફરે છે.\n\nપૂનમની રાત્રે ચાંદો આખો ગોળ દેખાય છે અને અમાસની રાત્રે દેખાતો નથી.\n\nબાળકો ચાંદાને પ્રેમથી "ચાંદામામા" કહે છે. ચાંદાની ઠંડી ચાંદની સૌને ગમે છે.',
				vocabulary: [
					{ word: 'પૂનમ', meaning: 'જે રાત્રે ચાંદો આખો દેખાય' },
					{ word: 'અમાસ', meaning: 'જે રાત્રે ચાંદો ન દેખાય' },
					{ word: 'ચાંદની', meaning: 'ચાંદાનો પ્રકાશ' },
				],
			},
		],
		questions: [
			['"મારું ગામ" પાઠ મુજબ ગામના લોકો કેવા છે?', ['આળસુ', 'સાદા અને મહેનતુ', 'ઝઘડાળુ', 'ઘમંડી'], 1, 1, 'પાઠમાં લખ્યું છે કે ગામના લોકો સાદા અને મહેનતુ છે.'],
			['ગામની વચ્ચે શું આવેલું છે?', ['રેલવે સ્ટેશન', 'મોટું બજાર', 'મોટું તળાવ', 'નદી'], 2, 1, 'ગામની વચ્ચે એક મોટું તળાવ છે.'],
			['"હરિયાળી" શબ્દનો અર્થ શું છે?', ['લીલોતરી', 'અંધારું', 'વરસાદ', 'ઠંડી'], 0, 1, 'હરિયાળી એટલે લીલોતરી.'],
			['વૃક્ષો પર કોણ માળા બાંધે છે?', ['માછલીઓ', 'પક્ષીઓ', 'ગાયો', 'દેડકા'], 1, 2, 'પક્ષીઓ વૃક્ષો પર માળા બાંધે છે.'],
			['"જતન" શબ્દનો અર્થ શું થાય?', ['ઝઘડો', 'રમત', 'ગીત', 'કાળજી'], 3, 2, 'જતન એટલે કાળજી રાખવી.'],
			['"મહેનતનું ફળ" વાર્તામાં મહેનતુ ખેડૂતનું નામ શું હતું?', ['શામુ', 'રામુ', 'ગોપાલ', 'મોહન'], 1, 3, 'રામુ રોજ વહેલો ઊઠીને ખેતરમાં કામ કરતો.'],
			['શામુનું ખેતર સૂકું કેમ રહ્યું?', ['તે આળસુ હતો', 'વરસાદ ન પડ્યો', 'બળદ બીમાર હતા', 'તે શહેરમાં ગયો'], 0, 3, 'શામુ આળસુ હતો એટલે તેણે સમયસર વાવણી ન કરી.'],
			['કચરો ક્યાં નાખવો જોઈએ?', ['રસ્તા પર', 'નદીમાં', 'કચરાપેટીમાં', 'પડોશીના આંગણામાં'], 2, 4, 'કચરો હંમેશાં કચરાપેટીમાં જ નાખવો જોઈએ.'],
			['ચાંદો કોના પ્રકાશથી ચમકે છે?', ['તારાના', 'દીવાના', 'પોતાના', 'સૂર્યના'], 3, 5, 'ચાંદો સૂર્યના પ્રકાશથી ચમકે છે.'],
			['કઈ રાત્રે ચાંદો આખો ગોળ દેખાય છે?', ['અમાસ', 'પૂનમ', 'દિવાળી', 'દરેક રાત્રે'], 1, 5, 'પૂનમની રાત્રે ચાંદો આખો ગોળ દેખાય છે.'],
		],
	},
	maths: {
		chapters: [
			{
				title: 'મોટી સંખ્યાઓ',
				summary: 'દસ હજાર અને લાખ સુધીની સંખ્યાઓ',
				content:
					'આપણે એકમ, દશક, સો અને હજાર જેવી સંખ્યાઓ શીખી ગયા છીએ. હવે આપણે દસ હજાર અને લાખ સુધીની સંખ્યાઓ શીખીશું.\n\n9,999 માં 1 ઉમેરતાં 10,000 (દસ હજાર) મળે છે. 99,999 માં 1 ઉમેરતાં 1,00,000 (એક લાખ) મળે છે.\n\nમોટી સંખ્યાઓ સહેલાઈથી વાંચવા અલ્પવિરામ મૂકીએ છીએ. જેમ કે 45,230 ને "પિસ્તાળીસ હજાર બસો ત્રીસ" વંચાય.',
				vocabulary: [
					{ word: 'સ્થાનકિંમત', meaning: 'અંકના સ્થાન પ્રમાણે તેનું મૂલ્ય' },
					{ word: 'અલ્પવિરામ', meaning: '"," ચિહ્ન' },
				],
			},
			{
				title: 'અપૂર્ણાંક',
				summary: 'સરખા ભાગ અને અપૂર્ણાંક',
				content:
					'જ્યારે કોઈ વસ્તુના સરખા ભાગ કરીએ ત્યારે દરેક ભાગને અપૂર્ણાંક વડે દર્શાવાય છે.\n\nએક રોટલીના 4 સરખા ભાગ કરીએ તો દરેક ભાગ 1/4 (એક ચતુર્થાંશ) છે.\n\nઅપૂર્ણાંકમાં ઉપરની સંખ્યા અંશ અને નીચેની સંખ્યા છેદ કહેવાય છે. 1/2 ને અડધું કહેવાય છે.',
				vocabulary: [
					{ word: 'અંશ', meaning: 'અપૂર્ણાંકની ઉપરની સંખ્યા' },
					{ word: 'છેદ', meaning: 'અપૂર્ણાંકની નીચેની સંખ્યા' },
				],
			},
		],
		questions: [
			['9,999 માં 1 ઉમેરતાં કઈ સંખ્યા મળે?', ['10,000', '9,000', '99,999', '1,000'], 0, 1, '9,999 + 1 = 10,000 (દસ હજાર).'],
			['45,230 માં 5 ની સ્થાનકિંમત કેટલી છે?', ['50', '500', '5,000', '50,000'], 2, 1, '5 હજારના સ્થાને છે, તેથી તેની કિંમત 5,000 છે.'],
			['એક લાખ (1,00,000) માં કેટલા શૂન્ય હોય છે?', ['4', '6', '3', '5'], 3, 1, '1,00,000 માં પાંચ શૂન્ય છે.'],
			['2,500 + 1,500 = ?', ['3,000', '4,000', '3,500', '5,000'], 1, null, '2,500 અને 1,500 નો સરવાળો 4,000 થાય.'],
			['36 ÷ 4 = ?', ['8', '6', '9', '7'], 2, null, '4 × 9 = 36, તેથી 36 ÷ 4 = 9.'],
			['12 × 5 = ?', ['50', '55', '65', '60'], 3, null, '12 ને 5 વડે ગુણતાં 60 મળે.'],
			['1/2 ને શું કહેવાય?', ['અડધું', 'પા', 'પોણું', 'આખું'], 0, 2, '1/2 એટલે અડધું.'],
			['અપૂર્ણાંક 3/4 માં છેદ કયો છે?', ['3', '4', '7', '1'], 1, 2, 'નીચેની સંખ્યા છેદ કહેવાય, અહીં 4 છે.'],
			['એક રોટલીના 4 સરખા ભાગમાંથી 1 ભાગ એટલે?', ['1/2', '1/3', '1/4', '4/1'], 2, 2, '4 સરખા ભાગમાંથી 1 ભાગ એટલે 1/4.'],
			['ચોરસને કેટલી બાજુઓ હોય છે?', ['3', '5', '6', '4'], 3, null, 'ચોરસને ચાર સરખી બાજુઓ હોય છે.'],
		],
	},
	science: {
		chapters: [
			{
				title: 'આપણો ખોરાક',
				summary: 'પોષક ખોરાક અને સમતોલ આહાર',
				content:
					'આપણું શરીર તંદુરસ્ત રાખવા માટે પોષક ખોરાક જરૂરી છે. ભાત, રોટલી અને બટાકા આપણને શક્તિ આપે છે.\n\nદાળ, દૂધ અને કઠોળમાં પ્રોટીન હોય છે, જે શરીરનો વિકાસ કરે છે. ફળો અને લીલાં શાકભાજીમાં વિટામિન અને ખનિજો હોય છે, જે આપણને રોગોથી બચાવે છે.\n\nજે ખોરાકમાં બધાં પોષક તત્ત્વો યોગ્ય પ્રમાણમાં હોય તેને સમતોલ આહાર કહેવાય.',
				vocabulary: [
					{ word: 'પોષક તત્ત્વ', meaning: 'શરીરને જરૂરી ખોરાકના ઘટકો' },
					{ word: 'સમતોલ આહાર', meaning: 'બધાં પોષક તત્ત્વો ધરાવતો ખોરાક' },
				],
			},
			{
				title: 'પાણીનું મહત્વ',
				summary: 'પાણી - જીવનનો આધાર',
				content:
					'પાણી વિના જીવન શક્ય નથી. માણસ, પ્રાણી અને વનસ્પતિ બધાંને પાણીની જરૂર છે. વરસાદ પાણીનો મુખ્ય સ્ત્રોત છે.\n\nપાણીને ગરમ કરતાં વરાળ બને છે અને ખૂબ ઠંડું કરતાં બરફ બને છે.\n\nનળ ખુલ્લો ન રાખીને અને વરસાદનું પાણી સંગ્રહીને આપણે પાણી બચાવવું જોઈએ.',
				vocabulary: [
					{ word: 'વરાળ', meaning: 'ગરમ થયેલું પાણી જે હવામાં ઊડી જાય' },
					{ word: 'સ્ત્રોત', meaning: 'જ્યાંથી કંઈ મળે તે જગ્યા' },
					{ word: 'સંગ્રહ', meaning: 'ભેગું કરીને રાખવું' },
				],
			},
		],
		questions: [
			['શરીરનો વિકાસ કરવા માટે કયું પોષક તત્ત્વ જરૂરી છે?', ['પ્રોટીન', 'ચરબી', 'પાણી', 'રેસા'], 0, 1, 'દાળ, દૂધ અને કઠોળમાં રહેલું પ્રોટીન શરીરનો વિકાસ કરે છે.'],
			['વિટામિન મુખ્યત્વે શેમાંથી મળે છે?', ['ખાંડ', 'ફળો અને લીલાં શાકભાજી', 'તેલ', 'મીઠું'], 1, 1, 'ફળો અને લીલાં શાકભાજીમાં વિટામિન હોય છે.'],
			['બધાં પોષક તત્ત્વો યોગ્ય પ્રમાણમાં હોય તેવા ખોરાકને શું કહેવાય?', ['જંક ફૂડ', 'ફાસ્ટ ફૂડ', 'સમતોલ આહાર', 'મીઠાઈ'], 2, 1, 'તેને સમતોલ આહાર કહેવાય.'],
			['પાણીને ગરમ કરતાં શું બને છે?', ['બરફ', 'માટી', 'હવા', 'વરાળ'], 3, 2, 'પાણી ગરમ થાય ત્યારે વરાળ બને છે.'],
			['પાણીનો મુખ્ય કુદરતી સ્ત્રોત કયો છે?', ['વરસાદ', 'નળ', 'બોટલ', 'ટાંકી'], 0, 2, 'વરસાદ પાણીનો મુખ્ય સ્ત્રોત છે.'],
			['આપણે કઈ ઇન્દ્રિય વડે સુગંધ પારખીએ છીએ?', ['આંખ', 'નાક', 'કાન', 'જીભ'], 1, null, 'નાક વડે આપણે સુગંધ પારખીએ છીએ.'],
			['છોડ પોતાનો ખોરાક શેમાં બનાવે છે?', ['મૂળ', 'ફૂલ', 'પાંદડાં', 'થડ'], 2, null, 'છોડ પાંદડાંમાં સૂર્યપ્રકાશની મદદથી ખોરાક બનાવે છે.'],
			['સૂર્યમાંથી આપણને શું મળે છે?', ['અંધારું', 'વરસાદ', 'બરફ', 'પ્રકાશ અને ગરમી'], 3, null, 'સૂર્ય આપણને પ્રકાશ અને ગરમી આપે છે.'],
			['પાણી બચાવવા માટે શું કરવું જોઈએ?', ['વાપર્યા પછી નળ બંધ કરવો', 'નળ ખુલ્લો રાખવો', 'પાણી ઢોળવું', 'રોજ ગાડી ધોવી'], 0, 2, 'વાપર્યા પછી નળ બંધ કરવાથી પાણી બચે છે.'],
			['નીચેનામાંથી કયું પ્રાણી પાણીમાં રહે છે?', ['ગાય', 'માછલી', 'બિલાડી', 'ઘોડો'], 1, null, 'માછલી પાણીમાં રહે છે.'],
		],
	},
	social: {
		chapters: [
			{
				title: 'આપણું ગુજરાત',
				summary: 'આપણા રાજ્યની ઓળખ',
				content:
					'ગુજરાત ભારતના પશ્ચિમ ભાગમાં આવેલું રાજ્ય છે. ગુજરાતનું પાટનગર ગાંધીનગર છે અને મુખ્ય ભાષા ગુજરાતી છે.\n\nભારતનાં રાજ્યોમાં ગુજરાતને સૌથી લાંબો દરિયાકિનારો મળ્યો છે. ગુજરાતનો સ્થાપના દિવસ 1 મે છે.\n\nમહાત્મા ગાંધી અને સરદાર વલ્લભભાઈ પટેલ જેવા મહાન નેતાઓ ગુજરાતના હતા. ગીરનાં જંગલમાં એશિયાઈ સિંહ જોવા મળે છે.',
				vocabulary: [
					{ word: 'પાટનગર', meaning: 'રાજ્યનું વહીવટી મુખ્ય શહેર' },
					{ word: 'દરિયાકિનારો', meaning: 'જમીન અને સમુદ્ર મળે તે ભાગ' },
				],
			},
			{
				title: 'નકશો સમજીએ',
				summary: 'દિશાઓ અને નકશાના રંગો',
				content:
					'નકશો એ પૃથ્વી કે તેના કોઈ ભાગનું કાગળ પર દોરેલું ચિત્ર છે. નકશામાં ચાર મુખ્ય દિશાઓ હોય છે - પૂર્વ, પશ્ચિમ, ઉત્તર અને દક્ષિણ.\n\nસૂર્ય પૂર્વ દિશામાં ઊગે છે અને પશ્ચિમ દિશામાં આથમે છે.\n\nનકશામાં વાદળી રંગ પાણી અને લીલો રંગ જંગલ કે મેદાન દર્શાવે છે.',
				vocabulary: [
					{ word: 'નકશો', meaning: 'જમીનના ભાગનું કાગળ પરનું ચિત્ર' },
					{ word: 'દિશા', meaning: 'કોઈ તરફની બાજુ' },
				],
			},
		],
		questions: [
			['ગુજરાતનું પાટનગર કયું છે?', ['અમદાવાદ', 'સુરત', 'ગાંધીનગર', 'રાજકોટ'], 2, 1, 'ગુજરાતનું પાટનગર ગાંધીનગર છે.'],
			['ગુજરાતનો સ્થાપના દિવસ કયો છે?', ['15 ઓગસ્ટ', '26 જાન્યુઆરી', '2 ઓક્ટોબર', '1 મે'], 3, 1, 'ગુજરાત રાજ્યની સ્થાપના 1 મે, 1960 ના રોજ થઈ હતી.'],
			['એશિયાઈ સિંહ ક્યાં જોવા મળે છે?', ['ગીરનાં જંગલમાં', 'કચ્છના રણમાં', 'સાપુતારામાં', 'દ્વારકામાં'], 0, 1, 'એશિયાઈ સિંહ ગીરનાં જંગલમાં જોવા મળે છે.'],
			['સૂર્ય કઈ દિશામાં ઊગે છે?', ['પશ્ચિમ', 'પૂર્વ', 'ઉત્તર', 'દક્ષિણ'], 1, 2, 'સૂર્ય પૂર્વ દિશામાં ઊગે છે.'],
			['નકશામાં વાદળી રંગ શું દર્શાવે છે?', ['જંગલ', 'પર્વત', 'પાણી', 'રણ'], 2, 2, 'નકશામાં વાદળી રંગ પાણી દર્શાવે છે.'],
			['સરદાર વલ્લભભાઈ પટેલને કયા નામે ઓળખવામાં આવે છે?', ['લોખંડી પુરુષ', 'રાષ્ટ્રપિતા', 'ચાચા નેહરુ', 'નેતાજી'], 0, 1, 'સરદાર પટેલ "લોખંડી પુરુષ" તરીકે ઓળખાય છે.'],
			['ભારતના રાષ્ટ્રપિતા કોણ છે?', ['જવાહરલાલ નેહરુ', 'સુભાષચંદ્ર બોઝ', 'ભગતસિંહ', 'મહાત્મા ગાંધી'], 3, null, 'મહાત્મા ગાંધીને રાષ્ટ્રપિતા કહેવાય છે.'],
			['નકશામાં કેટલી મુખ્ય દિશાઓ હોય છે?', ['બે', 'ચાર', 'છ', 'આઠ'], 1, 2, 'પૂર્વ, પશ્ચિમ, ઉત્તર અને દક્ષિણ - ચાર મુખ્ય દિશાઓ.'],
			['ભારતનો સ્વાતંત્ર્ય દિવસ કયો છે?', ['26 જાન્યુઆરી', '1 મે', '15 ઓગસ્ટ', '14 નવેમ્બર'], 2, null, 'ભારત 15 ઓગસ્ટ, 1947 ના રોજ આઝાદ થયું.'],
			['ગુજરાતની મુખ્ય ભાષા કઈ છે?', ['ગુજરાતી', 'મરાઠી', 'તમિલ', 'બંગાળી'], 0, 1, 'ગુજરાતની મુખ્ય ભાષા ગુજરાતી છે.'],
		],
	},
	english: {
		chapters: [
			{
				title: 'My School',
				summary: 'Words about our school',
				content:
					'My school is big and beautiful. It has a large playground and a library full of books.\n\nThere are twenty classrooms in my school. My teachers are kind and helpful. We sing the prayer every morning.\n\nI love my school.',
				vocabulary: [
					{ word: 'playground', meaning: 'રમતનું મેદાન' },
					{ word: 'library', meaning: 'પુસ્તકાલય' },
					{ word: 'prayer', meaning: 'પ્રાર્થના' },
					{ word: 'helpful', meaning: 'મદદરૂપ' },
				],
			},
			{
				title: 'Good Habits',
				summary: 'Habits that keep us healthy',
				content:
					'Good habits make us healthy and happy. We should wake up early in the morning and brush our teeth twice a day.\n\nWe must wash our hands before eating.\n\nWe should respect our elders and help others.',
				vocabulary: [
					{ word: 'habit', meaning: 'ટેવ' },
					{ word: 'healthy', meaning: 'તંદુરસ્ત' },
					{ word: 'elders', meaning: 'વડીલો' },
					{ word: 'respect', meaning: 'માન આપવું' },
				],
			},
		],
		questions: [
			['What is the opposite of "big"?', ['Small', 'Tall', 'Long', 'Wide'], 0, 1, '"Big" એટલે મોટું, તેનો વિરોધી શબ્દ "Small" (નાનું) છે.'],
			['Choose the correct spelling.', ['Scool', 'School', 'Skool', 'Schol'], 1, 1, 'સાચો સ્પેલિંગ School છે.'],
			['What does "library" mean in Gujarati?', ['રસોડું', 'બગીચો', 'પુસ્તકાલય', 'દવાખાનું'], 2, 1, 'Library એટલે પુસ્તકાલય.'],
			['How many times should we brush our teeth in a day?', ['Once', 'Three times', 'Never', 'Twice'], 3, 2, 'પાઠ મુજબ દિવસમાં બે વાર (twice) દાંત સાફ કરવા જોઈએ.'],
			['Fill in the blank: She ___ a good girl.', ['is', 'am', 'are', 'be'], 0, null, 'She સાથે "is" વપરાય.'],
			['Which word is a fruit?', ['Chair', 'Mango', 'Pencil', 'Book'], 1, null, 'Mango (કેરી) એક ફળ છે.'],
			['What is the plural of "child"?', ['Childs', 'Childes', 'Children', 'Childrens'], 2, null, 'Child નું બહુવચન Children થાય.'],
			['Which day comes after Monday?', ['Sunday', 'Wednesday', 'Friday', 'Tuesday'], 3, null, 'Monday પછી Tuesday આવે.'],
			['We must wash our hands before ___.', ['eating', 'reading', 'drawing', 'singing'], 0, 2, 'જમતાં પહેલાં હાથ ધોવા જોઈએ.'],
			['What is the opposite of "early"?', ['Soon', 'Late', 'Fast', 'Near'], 1, 2, '"Early" એટલે વહેલું, તેનો વિરોધી શબ્દ "Late" (મોડું) છે.'],
		],
	},
	gk: {
		chapters: [
			{
				title: 'આપણો દેશ ભારત',
				summary: 'રાષ્ટ્રીય પ્રતીકો',
				content:
					'ભારત આપણો દેશ છે. તેની રાજધાની નવી દિલ્હી છે.\n\nભારતનો રાષ્ટ્રધ્વજ ત્રિરંગો છે, જેમાં કેસરી, સફેદ અને લીલો રંગ છે અને વચ્ચે વાદળી રંગનું અશોકચક્ર છે.\n\nવાઘ આપણું રાષ્ટ્રીય પ્રાણી છે, મોર રાષ્ટ્રીય પક્ષી છે અને કમળ રાષ્ટ્રીય ફૂલ છે. "જન ગણ મન" આપણું રાષ્ટ્રગીત છે.',
				vocabulary: [
					{ word: 'રાજધાની', meaning: 'દેશનું મુખ્ય વહીવટી શહેર' },
					{ word: 'રાષ્ટ્રધ્વજ', meaning: 'દેશનો ધ્વજ' },
				],
			},
		],
		questions: [
			['ભારતની રાજધાની કઈ છે?', ['મુંબઈ', 'નવી દિલ્હી', 'કોલકાતા', 'ચેન્નાઈ'], 1, 1, 'ભારતની રાજધાની નવી દિલ્હી છે.'],
			['ભારતનું રાષ્ટ્રીય પક્ષી કયું છે?', ['મોર', 'પોપટ', 'કબૂતર', 'ચકલી'], 0, 1, 'મોર ભારતનું રાષ્ટ્રીય પક્ષી છે.'],
			['ભારતનું રાષ્ટ્રીય પ્રાણી કયું છે?', ['સિંહ', 'હાથી', 'વાઘ', 'ઘોડો'], 2, 1, 'વાઘ ભારતનું રાષ્ટ્રીય પ્રાણી છે.'],
			['અશોકચક્રમાં કેટલા આરા હોય છે?', ['12', '20', '32', '24'], 3, 1, 'અશોકચક્રમાં 24 આરા હોય છે.'],
			['ભારતનું રાષ્ટ્રીય ફૂલ કયું છે?', ['કમળ', 'ગુલાબ', 'મોગરો', 'સૂરજમુખી'], 0, 1, 'કમળ ભારતનું રાષ્ટ્રીય ફૂલ છે.'],
			['એક અઠવાડિયામાં કેટલા દિવસ હોય છે?', ['5', '7', '6', '8'], 1, null, 'અઠવાડિયામાં સાત દિવસ હોય છે.'],
			['આપણું રાષ્ટ્રગીત કયું છે?', ['વંદે માતરમ્', 'સારે જહાં સે અચ્છા', 'જન ગણ મન', 'જય જય ગરવી ગુજરાત'], 2, 1, '"જન ગણ મન" ભારતનું રાષ્ટ્રગીત છે.'],
			['મેઘધનુષ્યમાં કેટલા રંગ હોય છે?', ['5', '6', '8', '7'], 3, null, 'મેઘધનુષ્યમાં સાત રંગ હોય છે.'],
			['પૃથ્વી પર સૌથી મોટો મહાસાગર કયો છે?', ['પેસિફિક મહાસાગર', 'હિંદ મહાસાગર', 'આર્કટિક મહાસાગર', 'એટલાન્ટિક મહાસાગર'], 0, null, 'પેસિફિક (પ્રશાંત) મહાસાગર સૌથી મોટો છે.'],
			['એક વર્ષમાં કેટલા મહિના હોય છે?', ['10', '12', '11', '13'], 1, null, 'એક વર્ષમાં બાર મહિના હોય છે.'],
		],
	},
};

// Correct answers the demo student got in each of the last 3 weeks (oldest first)
const DEMO_SCORES: Partial<Record<SubjectKey, number[]>> = {
	gujarati: [7, 8, 9],
	maths: [5, 6, 7],
	science: [6, 7, 7],
	social: [5, 6, 7],
	english: [4, 5, 6],
	gk: [5, 5, 6],
};

// Live paid tests - shows the free / paid split in the app
const PAID_THIS_WEEK: SubjectKey[] = ['english', 'gk'];

const TEST_TITLE: Partial<Record<SubjectKey, string>> = {
	gujarati: 'ગુજરાતી - અઠવાડિક ટેસ્ટ',
	maths: 'ગણિત - અઠવાડિક ટેસ્ટ',
	science: 'વિજ્ઞાન - અઠવાડિક ટેસ્ટ',
	social: 'સામાજિક વિજ્ઞાન - અઠવાડિક ટેસ્ટ',
	english: 'અંગ્રેજી - Weekly Test',
	gk: 'સામાન્ય જ્ઞાન - અઠવાડિક ટેસ્ટ',
};

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

// Insert once, keep later edits from the admin panel
const UPSERT = { upsert: true, returnDocument: 'after' } as const;

async function seedCurriculum() {
	const subjectIds = new Map<string, string>(); // `${standard}:${key}` -> id

	for (let standard = 1; standard <= 10; standard++) {
		await StandardModel.updateOne(
			{ _id: standard },
			{ $set: { name: `ધોરણ ${standard}`, order: standard } },
			{ upsert: true }
		);

		const keys = subjectsForStandard(standard);
		for (const [order, key] of keys.entries()) {
			const subject = await SubjectModel.findOneAndUpdate(
				{ standardId: standard, nameEn: SUBJECTS[key].nameEn },
				{ $setOnInsert: { ...SUBJECTS[key], order } },
				UPSERT
			).lean();
			subjectIds.set(`${standard}:${key}`, subject!._id.toString());
		}
	}
	console.log('✔ Standards 1-10 and subjects');
	return subjectIds;
}

async function seedUsers() {
	// Super admin - logs in with this email or mobile (or the username)
	const adminUsername = (process.env.SEED_ADMIN_USERNAME ?? 'admin').toLowerCase();
	const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || null;
	const adminMobile = process.env.SEED_ADMIN_MOBILE?.trim() || null;
	const admin = await UserModel.findOneAndUpdate(
		{ username: adminUsername },
		{
			$setOnInsert: {
				password: await hashPassword(requireEnv('SEED_ADMIN_PASSWORD')),
				fullName: 'શાળા સંચાલક',
				role: UserRole.ADMIN,
			},
			$set: { email: adminEmail, mobile: adminMobile },
		},
		UPSERT
	).lean();

	const studentPassword = await hashPassword(requireEnv('SEED_STUDENT_PASSWORD'));
	// Two siblings sharing one family mobile number
	const abhishek = await UserModel.findOneAndUpdate(
		{ username: 'abhishek' },
		{
			$setOnInsert: {
				password: studentPassword,
				fullName: 'અભિષેક પટેલ',
				mobile: '9876543210',
				standardId: 5,
				avatar: 'boy',
				schoolName: 'શ્રી વિદ્યા મંદિર',
			},
		},
		UPSERT
	).lean();
	await UserModel.updateOne(
		{ username: 'riya' },
		{
			$setOnInsert: {
				password: studentPassword,
				fullName: 'રિયા પટેલ',
				mobile: '9876543210',
				standardId: 3,
				avatar: 'girl',
				isSchoolStudent: true,
				schoolName: process.env.SCHOOL_NAME ?? null,
			},
		},
		{ upsert: true }
	);
	console.log('✔ Demo admin and students');
	return { adminId: admin!._id.toString(), studentId: abhishek!._id.toString() };
}

async function seedStd5Content(subjectIds: Map<string, string>, adminId: string, studentId: string) {
	if ((await QuestionModel.countDocuments({ standardId: 5 })) > 0) {
		console.log('• Std 5 sample content already present - skipped');
		return;
	}

	const { weekStart: thisWeek, weekEnd: thisWeekEnd } = getWeekRange();

	for (const [key, data] of Object.entries(STD5) as [SubjectKey, NonNullable<(typeof STD5)[SubjectKey]>][]) {
		const subjectId = subjectIds.get(`5:${key}`)!;

		// Chapters
		const chapterIds = new Map<number, string>();
		for (const [index, chapter] of data.chapters.entries()) {
			const created = await ChapterModel.findOneAndUpdate(
				{ subjectId, number: index + 1 },
				{ $setOnInsert: chapter },
				UPSERT
			).lean();
			chapterIds.set(index + 1, created!._id.toString());
		}

		// Approved question bank
		const questions = await QuestionModel.insertMany(
			data.questions.map(([text, options, correctOption, chapterNumber, explanation]) => ({
				standardId: 5,
				subjectId,
				chapterId: chapterNumber ? chapterIds.get(chapterNumber) : null,
				text,
				options,
				correctOption,
				explanation,
				difficulty: Difficulty.EASY,
				source: QuestionSource.MANUAL,
				status: QuestionStatus.APPROVED,
				createdById: adminId,
				reviewedById: adminId,
				reviewedAt: new Date(),
			}))
		);

		const createTest = (weekStart: Date, weekEnd: Date, isPaid: boolean) =>
			TestModel.create({
				title: TEST_TITLE[key]!,
				description: 'આ અઠવાડિયાના અભ્યાસક્રમ પર આધારિત ટેસ્ટ',
				standardId: 5,
				subjectId,
				weekStart,
				weekEnd,
				durationMinutes: 10,
				difficulty: Difficulty.EASY,
				isPaid,
				status: TestStatus.PUBLISHED,
				createdById: adminId,
				questions: questions.map((question, index) => ({ questionId: question._id, order: index + 1 })),
			});

		// This week's live test
		await createTest(thisWeek, thisWeekEnd, PAID_THIS_WEEK.includes(key));

		// Past 3 weeks with graded attempts for the demo student
		const scores = DEMO_SCORES[key] ?? [];
		for (const [index, correctCount] of scores.entries()) {
			const weeksAgo = scores.length - index;
			const weekStart = getWeekStartWeeksAgo(weeksAgo);
			const weekEnd = getWeekStartWeeksAgo(weeksAgo - 1);
			const test = await createTest(weekStart, weekEnd, false);

			const answers = Object.fromEntries(
				questions.map((question, qIndex) => [
					question._id.toString(),
					qIndex < correctCount ? question.correctOption : (question.correctOption + 1) % 4,
				])
			);
			const startedAt = new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000);
			await TestAttemptModel.create({
				userId: studentId,
				testId: test._id,
				answers,
				score: correctCount,
				totalMarks: questions.length,
				correctCount,
				wrongCount: questions.length - correctCount,
				skippedCount: 0,
				percentage: toPercentage(correctCount, questions.length),
				startedAt,
				submittedAt: new Date(startedAt.getTime() + 7 * 60 * 1000),
				timeTakenSeconds: 7 * 60,
			});
		}

		// Demo student finished the first chapter of every subject
		await ChapterProgressModel.create({ userId: studentId, chapterId: chapterIds.get(1)! });
	}

	const subject = (key: SubjectKey) => subjectIds.get(`5:${key}`)!;
	const MB = 1024 * 1024;

	// Placeholder links - replace from the admin panel with real files
	await StudyMaterialModel.insertMany([
		{ standardId: 5, subjectId: subject('gujarati'), title: 'ગુજરાતી નોટ્સ (ધોરણ 5)', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/gujarati-notes.pdf', sizeBytes: Math.round(2.4 * MB) },
		{ standardId: 5, subjectId: subject('maths'), title: 'ગણિત નોટ્સ (ધોરણ 5)', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/maths-notes.pdf', sizeBytes: Math.round(1.8 * MB) },
		{ standardId: 5, subjectId: subject('science'), title: 'વિજ્ઞાન નોટ્સ (ધોરણ 5)', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/science-notes.pdf', sizeBytes: Math.round(3.1 * MB) },
		{ standardId: 5, subjectId: subject('social'), title: 'સામાજિક વિજ્ઞાન નોટ્સ', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/social-notes.pdf', sizeBytes: Math.round(2.1 * MB) },
		{ standardId: 5, subjectId: subject('english'), title: 'અંગ્રેજી નોટ્સ', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/english-notes.pdf', sizeBytes: Math.round(2.8 * MB) },
		{ standardId: 5, subjectId: subject('gk'), title: 'સામાન્ય જ્ઞાન નોટ્સ', type: MaterialType.NOTE, url: 'https://example.com/shala-sangathi/std5/gk-notes.pdf', sizeBytes: Math.round(1.5 * MB) },
		{ standardId: 5, subjectId: subject('maths'), title: 'ગણિત પાઠ્યપુસ્તક (PDF)', type: MaterialType.PDF, url: 'https://example.com/shala-sangathi/std5/maths-textbook.pdf', sizeBytes: Math.round(8.6 * MB) },
		{ standardId: 5, subjectId: subject('gujarati'), title: 'ગુજરાતી પાઠ્યપુસ્તક (PDF)', type: MaterialType.PDF, url: 'https://example.com/shala-sangathi/std5/gujarati-textbook.pdf', sizeBytes: Math.round(7.2 * MB) },
		{ standardId: 5, subjectId: subject('science'), title: 'પાણીનું ચક્ર - વિડિયો', type: MaterialType.VIDEO, url: 'https://example.com/shala-sangathi/std5/water-cycle' },
		{ standardId: 5, subjectId: subject('maths'), title: 'અપૂર્ણાંક સમજીએ - વિડિયો', type: MaterialType.VIDEO, url: 'https://example.com/shala-sangathi/std5/fractions' },
	]);

	const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	await HomeworkModel.insertMany([
		{ standardId: 5, subjectId: subject('gujarati'), title: 'પાઠ 2 ના શબ્દાર્થ લખો', description: '"વૃક્ષો આપણા મિત્ર" પાઠના બધા શબ્દાર્થ નોટબુકમાં બે વાર લખો.', dueDate: inDays(1) },
		{ standardId: 5, subjectId: subject('maths'), title: 'અપૂર્ણાંકના 10 દાખલા', description: 'પાઠ્યપુસ્તકના સ્વાધ્યાય 2 ના 1 થી 10 દાખલા ગણો.', dueDate: inDays(2) },
		{ standardId: 5, subjectId: subject('science'), title: 'સમતોલ આહારનો ચાર્ટ', description: 'તમારા એક દિવસના ખોરાકનો ચાર્ટ બનાવો અને તેમાં કયાં પોષક તત્ત્વો છે તે લખો.', dueDate: inDays(4) },
	]);

	console.log('✔ Std 5 chapters, 60 questions, weekly tests, past results, materials and homework');
}

async function seedAds() {
	if ((await AdModel.countDocuments()) > 0) return;
	const baseUrl = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
	await AdModel.insertMany([
		{ title: 'શાળા સંગાથી - નવા સત્રના પ્રવેશ શરૂ', type: AdType.BANNER, imageUrl: `${baseUrl}/static/ads/banner.jpg`, priority: 1 },
		{ title: 'શાળા સંગાથી - તમારી સફળતા, અમારો સંગાથ', type: AdType.INTERSTITIAL, imageUrl: `${baseUrl}/static/ads/interstitial.jpg`, priority: 1 },
	]);
	console.log('✔ Sample house ads');
}

async function main() {
	await connectDatabase();
	const subjectIds = await seedCurriculum();
	const { adminId, studentId } = await seedUsers();
	await seedStd5Content(subjectIds, adminId, studentId);
	await seedAds();
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => disconnectDatabase());
