import bcrypt from 'bcryptjs';

// Hash Password
export const hashPassword = async (password: string) => {
	return bcrypt.hash(password, 10);
};

// Compare Password
export const comparePassword = async (password: string, hash: string) => {
	return bcrypt.compare(password, hash);
};
