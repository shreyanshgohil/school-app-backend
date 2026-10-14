import { model, Schema } from 'mongoose';

// One document per logged-in device session. The access token carries the token id,
// so deleting the document (logout) invalidates both tokens immediately.
export interface Token {
	id: string;
	userId: string;
	refreshToken: string;
	deviceId: string | null;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const tokenSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		refreshToken: { type: String, required: true, unique: true },
		deviceId: { type: String, default: null },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true, versionKey: false }
);

// MongoDB removes expired sessions by itself
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

tokenSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });

export const TokenModel = model('Token', tokenSchema);
