import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
	// eslint-disable-next-line no-console
	console.warn('[backend] JWT_SECRET not set. Create backend/.env from backend/.env.example');
}

const port = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(port, '0.0.0.0', () => {
	// eslint-disable-next-line no-console
	console.log(`[backend] listening on 0.0.0.0:${port}`);
});

