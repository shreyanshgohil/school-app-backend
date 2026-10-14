import { AdType } from '../enum';
import { compact, found, normalize } from '../helpers/mongoHelper';
import { AdInput } from '../interfaces/contentInterface';
import { Ad, AdModel } from '../models';

class AdRepository {
	// Active ads of a type that are inside their schedule window, highest priority first
	async getActive(type: AdType) {
		const now = new Date();
		const ads = await AdModel.find({
			type,
			isActive: true,
			$and: [
				{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
				{ $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
			],
		})
			.sort({ priority: -1, createdAt: -1 })
			.select('title type imageUrl targetUrl')
			.lean();
		return normalize<Pick<Ad, 'id' | 'title' | 'type' | 'imageUrl' | 'targetUrl'>[]>(ads);
	}

	async getAll() {
		return normalize<Ad[]>(await AdModel.find().sort({ type: 1, priority: -1 }).lean());
	}

	async getById(id: string) {
		return normalize<Ad | null>(await AdModel.findById(id).lean());
	}

	async create(data: AdInput) {
		const ad = await AdModel.create(data);
		return normalize<Ad>(ad.toObject());
	}

	async update(id: string, data: Partial<AdInput>) {
		const ad = await AdModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Ad>(found(ad));
	}

	async delete(id: string) {
		return normalize<Ad>(found(await AdModel.findByIdAndDelete(id).lean()));
	}
}

export default new AdRepository();
