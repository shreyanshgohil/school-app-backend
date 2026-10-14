// India has no DST, so a fixed +05:30 offset is exact
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Monday 00:00 IST of the week containing `date`, and the next Monday 00:00 IST
export const getWeekRange = (date: Date = new Date()) => {
	// Shift so the UTC getters read IST wall-clock values
	const ist = new Date(date.getTime() + IST_OFFSET_MS);
	const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
	const mondayIstMidnight = Date.UTC(
		ist.getUTCFullYear(),
		ist.getUTCMonth(),
		ist.getUTCDate() - daysSinceMonday
	);
	const weekStart = new Date(mondayIstMidnight - IST_OFFSET_MS);
	const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
	return { weekStart, weekEnd };
};

// Start of the week `weeksAgo` weeks before the current week
export const getWeekStartWeeksAgo = (weeksAgo: number, from: Date = new Date()) => {
	const { weekStart } = getWeekRange(from);
	return new Date(weekStart.getTime() - weeksAgo * 7 * DAY_MS);
};

export const addMonths = (date: Date, months: number) => {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
};
