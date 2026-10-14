import { model, Schema } from 'mongoose';
import { UserRole } from '../enum';

export interface User {
	id: string;
	username: string;
	password: string;
	fullName: string;
	// Staff (super admins) log in with email or mobile; students use username
	email: string | null;
	// Optional on purpose: siblings can share one family mobile number
	mobile: string | null;
	role: UserRole;
	standardId: number | null;
	schoolName: string | null;
	// Regular students of our own school get every test free
	isSchoolStudent: boolean;
	avatar: string | null;
	isActive: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const userSchema = new Schema(
	{
		username: { type: String, required: true, unique: true },
		// Never returned unless a query asks for `+password`
		password: { type: String, required: true, select: false },
		fullName: { type: String, required: true },
		email: { type: String, default: null },
		mobile: { type: String, default: null, index: true },
		role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT },
		standardId: { type: Number, ref: 'Standard', default: null, index: true },
		schoolName: { type: String, default: null },
		isSchoolStudent: { type: Boolean, default: false },
		avatar: { type: String, default: null },
		isActive: { type: Boolean, default: true },
		lastLoginAt: { type: Date, default: null },
	},
	{ timestamps: true, versionKey: false }
);

// Unique only when set - students have no email
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

userSchema.virtual('standard', { ref: 'Standard', localField: 'standardId', foreignField: '_id', justOne: true });

export const UserModel = model('User', userSchema);
