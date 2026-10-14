export class CustomError extends Error {
	status: number;
	additionalInfo: unknown;

	constructor(
		status: number = 500,
		message: string = 'કંઈક ખોટું થયું, ફરી પ્રયત્ન કરો',
		additionalInfo: unknown = {}
	) {
		super(message);
		this.name = 'CustomError';
		this.status = status;
		this.additionalInfo = additionalInfo;
	}
}
