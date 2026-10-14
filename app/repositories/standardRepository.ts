import { normalize } from '../helpers/mongoHelper';
import { Standard, StandardModel } from '../models';

class StandardRepository {
	async getAll() {
		const standards = await StandardModel.find().sort({ order: 1 }).select('name').lean();
		return normalize<Pick<Standard, 'id' | 'name'>[]>(standards);
	}

	async exists(id: number) {
		return !!(await StandardModel.exists({ _id: id }));
	}
}

export default new StandardRepository();
