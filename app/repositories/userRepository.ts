import { UserRole } from '../enum';
import { compact, contains, found, isId, normalize } from '../helpers/mongoHelper';
import { Standard, User, UserModel } from '../models';

// Never return the password hash in API responses
const PUBLIC_FIELDS =
	'username fullName email mobile role standardId schoolName isSchoolStudent avatar isActive lastLoginAt createdAt';
const WITH_STANDARD = { path: 'standard', select: 'name' };
const STAFF_ROLES = [UserRole.ADMIN, UserRole.TEACHER];

export type PublicUser = Omit<User, 'password' | 'updatedAt'> & {
	standard: Pick<Standard, 'id' | 'name'> | null;
};

export type UserWrite = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export interface UserListFilters {
	search?: string;
	standardId?: number;
	isSchoolStudent?: boolean;
	isActive?: boolean;
	role?: UserRole | UserRole[];
}

const buildFilter = (filters: UserListFilters) =>
	compact({
		role: Array.isArray(filters.role) ? { $in: filters.role } : filters.role,
		standardId: filters.standardId,
		isSchoolStudent: filters.isSchoolStudent,
		isActive: filters.isActive,
		$or: filters.search
			? [
					{ fullName: contains(filters.search) },
					{ username: contains(filters.search) },
					{ email: contains(filters.search) },
					{ mobile: contains(filters.search) },
				]
			: undefined,
	});

const notSelf = (exceptId?: string) => (exceptId ? { _id: { $ne: exceptId } } : {});

class UserRepository {
	// Includes the password hash - only for login / password checks
	async getByUsernameWithPassword(username: string) {
		return normalize<User | null>(await UserModel.findOne({ username }).select('+password').lean());
	}

	async getByEmailWithPassword(email: string) {
		return normalize<User | null>(await UserModel.findOne({ email }).select('+password').lean());
	}

	// Mobile is only a login id for staff - students may share a family number
	async getStaffByMobileWithPassword(mobile: string) {
		const user = await UserModel.findOne({ mobile, role: { $in: STAFF_ROLES } })
			.select('+password')
			.lean();
		return normalize<User | null>(user);
	}

	async isEmailTaken(email: string, exceptId?: string) {
		return !!(await UserModel.exists({ email, ...notSelf(exceptId) }));
	}

	async isStaffMobileTaken(mobile: string, exceptId?: string) {
		return !!(await UserModel.exists({ mobile, role: { $in: STAFF_ROLES }, ...notSelf(exceptId) }));
	}

	async getByIdWithPassword(id: string) {
		if (!isId(id)) return null;
		return normalize<User | null>(await UserModel.findById(id).select('+password').lean());
	}

	async getById(id: string) {
		// Ids from old sessions or bad input simply don't match
		if (!isId(id)) return null;
		const user = await UserModel.findById(id).select(PUBLIC_FIELDS).populate(WITH_STANDARD).lean();
		return normalize<PublicUser | null>(user);
	}

	async isUsernameTaken(username: string) {
		return !!(await UserModel.exists({ username }));
	}

	async create(data: UserWrite) {
		const user = await UserModel.create(data);
		return found(await this.getById(user._id.toString()));
	}

	async update(id: string, data: UserWrite) {
		const user = await UserModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		)
			.select(PUBLIC_FIELDS)
			.populate(WITH_STANDARD)
			.lean();
		return normalize<PublicUser>(found(user));
	}

	async updateLastLogin(id: string) {
		await UserModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
	}

	async getAll(filters: UserListFilters, offset: number, limit: number) {
		const users = await UserModel.find(buildFilter(filters))
			.select(PUBLIC_FIELDS)
			.populate(WITH_STANDARD)
			.sort({ createdAt: -1 })
			.skip(offset)
			.limit(limit)
			.lean();
		return normalize<PublicUser[]>(users);
	}

	async count(filters: UserListFilters) {
		return UserModel.countDocuments(buildFilter(filters));
	}
}

export default new UserRepository();
