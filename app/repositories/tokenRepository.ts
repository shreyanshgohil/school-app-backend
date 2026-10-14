import { isId, normalize } from '../helpers/mongoHelper';
import { Token, TokenModel, User } from '../models';

// Expired sessions are removed by the TTL index on `expiresAt`
class TokenRepository {
	async create(data: { id: string; userId: string; refreshToken: string; deviceId?: string; expiresAt: Date }) {
		const { id, ...rest } = data;
		const token = await TokenModel.create({ _id: id, ...rest });
		return normalize<Token>(token.toObject());
	}

	async findActiveSession(tokenId: string, userId: string) {
		// Tokens issued before an id format change simply don't match
		if (!isId(tokenId) || !isId(userId)) return null;

		const session = normalize<(Token & { user: Pick<User, 'id' | 'isActive' | 'role'> | null }) | null>(
			await TokenModel.findOne({ _id: tokenId, userId, expiresAt: { $gt: new Date() } })
				.populate({ path: 'user', select: 'isActive role' })
				.lean()
		);
		if (!session?.user) return null;
		return { ...session, user: session.user };
	}

	async findByRefreshToken(refreshToken: string) {
		return normalize<Token | null>(await TokenModel.findOne({ refreshToken }).lean());
	}

	async rotate(id: string, refreshToken: string, expiresAt: Date) {
		await TokenModel.updateOne({ _id: id }, { $set: { refreshToken, expiresAt } });
	}

	async delete(id: string) {
		if (!isId(id)) return;
		await TokenModel.deleteOne({ _id: id });
	}

	async deleteAllForUser(userId: string, exceptTokenId?: string) {
		await TokenModel.deleteMany({ userId, ...(exceptTokenId ? { _id: { $ne: exceptTokenId } } : {}) });
	}
}

export default new TokenRepository();
