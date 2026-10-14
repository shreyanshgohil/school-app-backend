import { AdInput } from '../interfaces/contentInterface';
import { AdType } from '../enum';
import { CustomError } from '../models/customError';
import { adRepository } from '../repositories';

class AdServices {
	// One banner and one interstitial for the app. When there are several, rotate
	// among the highest-priority ones so each gets shown.
	async getActiveAds() {
		const [banners, interstitials] = await Promise.all([
			adRepository.getActive(AdType.BANNER),
			adRepository.getActive(AdType.INTERSTITIAL),
		]);

		const pick = <T>(ads: T[]) => (ads.length ? ads[Math.floor(Math.random() * ads.length)] : null);
		const topPriority = <T extends { id: string }>(ads: T[]) => ads.slice(0, 3);

		return {
			banner: pick(topPriority(banners)),
			interstitial: pick(topPriority(interstitials)),
		};
	}

	async getById(id: string) {
		const ad = await adRepository.getById(id);
		if (!ad) throw new CustomError(404, 'જાહેરાત મળી નથી');
		return ad;
	}

	async getAll() {
		return adRepository.getAll();
	}

	async create(data: AdInput) {
		return adRepository.create(data);
	}

	async update(id: string, data: Partial<AdInput>) {
		return adRepository.update(id, data);
	}

	async delete(id: string) {
		return adRepository.delete(id);
	}
}

export default new AdServices();
