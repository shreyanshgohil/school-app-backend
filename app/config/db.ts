import mongoose from 'mongoose';
import config from '../../config';
// Registers every model with mongoose
import '../models';

// Database Connection
export const connectDatabase = async () => {
	await mongoose.connect(config.mongodbUri);
	// Build the unique / TTL indexes declared on the schemas before serving requests
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	console.log('Database connected successfully');
};

export const disconnectDatabase = () => mongoose.disconnect();
