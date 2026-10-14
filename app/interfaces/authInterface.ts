export interface RegisterInput {
	fullName: string;
	username: string;
	password: string;
	standardId: number;
	mobile?: string;
	schoolName?: string;
	schoolCode?: string;
	avatar?: string;
	deviceId?: string;
}

export interface UpdateProfileInput {
	fullName?: string;
	mobile?: string | null;
	avatar?: string;
	standardId?: number;
}
