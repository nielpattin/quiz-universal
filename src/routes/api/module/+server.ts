import { json } from '@sveltejs/kit';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

export async function GET({ url }: { url: URL }) {
	const id = url.searchParams.get('id')?.trim().toLowerCase();
	const idsParam = url.searchParams.get('ids');
	const db = createClient({
		url: env.TURSO_URL,
		authToken: env.TURSO_AUTH_TOKEN
	});

	let quizzes: unknown[];

	try {
		if (idsParam) {
			const ids = idsParam
				.split(',')
				.map((x: string) => x.trim())
				.filter(Boolean);
			if (ids.length > 0) {
				const placeholders = ids.map(() => '?').join(',');
				const rows = await db.execute({
					sql: `SELECT * FROM questions WHERE question_id IN (${placeholders})`,
					args: ids
				});
				quizzes = rows.rows.map((row: { [key: string]: unknown }) => ({
					...row,
					answers: typeof row.answers === 'string' ? JSON.parse(row.answers as string) : row.answers
				}));
			} else {
				quizzes = [];
			}
		} else if (id && /^(\d+)$/.test(id)) {
			const moduleKey = `module_${id}`;
			const rows = await db.execute({
				sql: 'SELECT * FROM questions WHERE quiz_number = ?',
				args: [moduleKey]
			});
			quizzes = rows.rows.map((row: { [key: string]: unknown }) => ({
				...row,
				answers: typeof row.answers === 'string' ? JSON.parse(row.answers as string) : row.answers
			}));
		} else if (id === 'all') {
			const rows = await db.execute('SELECT * FROM questions');
			quizzes = rows.rows.map((row: { [key: string]: unknown }) => ({
				...row,
				answers: typeof row.answers === 'string' ? JSON.parse(row.answers as string) : row.answers
			}));
		} else {
			quizzes = [];
		}
	} catch (err) {
		return json(
			{ error: 'Failed to fetch from Turso', details: err instanceof Error ? err.message : err },
			{ status: 500 }
		);
	}

	return json({ quizzes });
}

export async function POST({ request }: { request: Request }) {
	const db = createClient({
		url: env.TURSO_URL,
		authToken: env.TURSO_AUTH_TOKEN
	});

	let quizzes: unknown[];
	try {
		const { ids } = await request.json();
		if (Array.isArray(ids) && ids.length > 0) {
			const placeholders = ids.map(() => '?').join(',');
			const rows = await db.execute({
				sql: `SELECT * FROM questions WHERE question_id IN (${placeholders})`,
				args: ids
			});
			quizzes = rows.rows.map((row: { [key: string]: unknown }) => ({
				...row,
				answers: typeof row.answers === 'string' ? JSON.parse(row.answers as string) : row.answers
			}));
		} else {
			quizzes = [];
		}
	} catch (err) {
		return json(
			{ error: 'Failed to fetch from Turso', details: err instanceof Error ? err.message : err },
			{ status: 500 }
		);
	}
	return json({ quizzes });
}
