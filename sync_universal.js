import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load .env first, then .env.local so local overrides base
// Pass --prod to skip .env.local and use .env (production) directly
config();
if (!args.includes('--prod')) {
	config({ path: '.env.local', override: true });
}

// --- CLI Argument Parsing ---
const args = process.argv.slice(2);
const FLAGS = {
	clean: args.includes('--clean'),
	noDelete: args.includes('--no-delete'),
	dryRun: args.includes('--dry-run'),
	verbose: args.includes('--verbose')
};

// --- Database Client ---
const db = createClient({
	url: process.env.TURSO_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

// --- Helpers ---
function log(message, level = 'info') {
	if (level === 'verbose' && !FLAGS.verbose) return;
	console.log(message);
}

function parseQuizContent(filePath) {
	const content = readFileSync(filePath, 'utf8');
	return JSON.parse(content);
}

// --- Stats Tracking ---
const stats = {
	subjects: { added: 0, updated: 0, deleted: 0 },
	collections: { added: 0, updated: 0, deleted: 0 },
	questions: { added: 0, updated: 0, deleted: 0 }
};

// --- Database Operations ---
async function ensureTables() {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS subjects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			display_order INTEGER DEFAULT 0,
			description TEXT
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS quiz_collections (
			id TEXT PRIMARY KEY,
			subject_id TEXT NOT NULL,
			name TEXT NOT NULL,
			display_order INTEGER DEFAULT 0,
			FOREIGN KEY (subject_id) REFERENCES subjects(id)
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS questions (
			question_id TEXT PRIMARY KEY,
			collection_id TEXT NOT NULL,
			question_text TEXT,
			question_text_en TEXT,
			question_text_vi TEXT,
			question_type TEXT NOT NULL,
			answers TEXT NOT NULL,
			image_url TEXT,
			status TEXT DEFAULT 'active',
			FOREIGN KEY (collection_id) REFERENCES quiz_collections(id)
		)
	`);
}

async function dropAllTables() {
	await db.execute(`DROP TABLE IF EXISTS questions`);
	await db.execute(`DROP TABLE IF EXISTS quiz_collections`);
	await db.execute(`DROP TABLE IF EXISTS subjects`);
}

async function getExistingSubjects() {
	const result = await db.execute('SELECT id, name, display_order, description FROM subjects');
	return new Map(result.rows.map((row) => [row.id, row]));
}

async function getExistingCollections() {
	const result = await db.execute(
		'SELECT id, subject_id, name, display_order FROM quiz_collections'
	);
	return new Map(result.rows.map((row) => [row.id, row]));
}

async function getExistingQuestions() {
	const result = await db.execute(
		'SELECT question_id, collection_id, question_text, question_type, answers, image_url FROM questions'
	);
	return new Map(result.rows.map((row) => [row.question_id, row]));
}

async function upsertSubject(id, name, displayOrder, description) {
	if (FLAGS.dryRun) return;
	await db.execute({
		sql: `INSERT OR REPLACE INTO subjects (id, name, display_order, description) VALUES (?, ?, ?, ?)`,
		args: [id, name, displayOrder, description]
	});
}

async function upsertCollection(id, subjectId, name, displayOrder) {
	if (FLAGS.dryRun) return;
	await db.execute({
		sql: `INSERT OR REPLACE INTO quiz_collections (id, subject_id, name, display_order) VALUES (?, ?, ?, ?)`,
		args: [id, subjectId, name, displayOrder]
	});
}

async function upsertQuestion(q, collectionId) {
	if (FLAGS.dryRun) return;
	await db.execute({
		sql: `INSERT OR REPLACE INTO questions (question_id, collection_id, question_text, question_text_en, question_text_vi, question_type, answers, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			q.question_id,
			collectionId,
			q.question_text || null,
			q.question_text_en || null,
			q.question_text_vi || null,
			q.question_type,
			JSON.stringify(q.answers),
			q.image_url || null,
			'active'
		]
	});
}

async function upsertQuestionsBatch(questions) {
	if (FLAGS.dryRun) return;
	if (questions.length === 0) return;

	const placeholders = questions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
	const args = questions.flatMap((q) => [
		q.question_id,
		q.collection_id,
		q.question_text || null,
		q.question_text_en || null,
		q.question_text_vi || null,
		q.question_type,
		JSON.stringify(q.answers),
		q.image_url || null,
		'active'
	]);

	await db.execute({
		sql: `INSERT OR REPLACE INTO questions (question_id, collection_id, question_text, question_text_en, question_text_vi, question_type, answers, image_url, status) VALUES ${placeholders}`,
		args
	});
}

async function deleteSubject(id) {
	if (FLAGS.dryRun) return;
	await db.execute({ sql: 'DELETE FROM subjects WHERE id = ?', args: [id] });
}

async function deleteCollection(id) {
	if (FLAGS.dryRun) return;
	// Delete questions first (foreign key)
	await db.execute({ sql: 'DELETE FROM questions WHERE collection_id = ?', args: [id] });
	await db.execute({ sql: 'DELETE FROM quiz_collections WHERE id = ?', args: [id] });
}

async function deleteQuestion(id) {
	if (FLAGS.dryRun) return;
	await db.execute({ sql: 'DELETE FROM questions WHERE question_id = ?', args: [id] });
}

// --- File Scanning ---
function scanSubjectsDirectory() {
	const subjectsDir = 'subjects';
	const result = {
		subjects: new Map(),
		collections: new Map(),
		questions: new Map()
	};

	const subjectFolders = readdirSync(subjectsDir).filter((f) =>
		statSync(join(subjectsDir, f)).isDirectory()
	);

	for (const subjectId of subjectFolders) {
		const subjectPath = join(subjectsDir, subjectId);
		const infoPath = join(subjectPath, 'subjectInfo.json');

		let subjectInfo = { name: subjectId, order: 0, description: '' };
		if (readdirSync(subjectPath).includes('subjectInfo.json')) {
			subjectInfo = JSON.parse(readFileSync(infoPath, 'utf8'));
		}

		result.subjects.set(subjectId, {
			id: subjectId,
			name: subjectInfo.name,
			display_order: subjectInfo.order || 0,
			description: subjectInfo.description || ''
		});

		const quizFiles = readdirSync(subjectPath).filter(
			(f) => f.endsWith('.json') && f !== 'subjectInfo.json'
		);

		for (const file of quizFiles) {
			const quizPath = join(subjectPath, file);
			const ext = extname(file);
			const fileName = basename(file, ext);

			const match = fileName.match(/^(\d+)-(.*)$/);
			const displayOrder = match ? parseInt(match[1], 10) : 0;
			const quizName = match ? match[2].replace(/-/g, ' ') : fileName.replace(/-/g, ' ');
			const collectionId = `${subjectId}-${fileName}`;

			result.collections.set(collectionId, {
				id: collectionId,
				subject_id: subjectId,
				name: quizName,
				display_order: displayOrder
			});

			const questions = parseQuizContent(quizPath);
			for (const q of questions) {
				result.questions.set(q.question_id, {
					...q,
					collection_id: collectionId
				});
			}
		}
	}

	return result;
}

// --- Comparison & Sync Logic ---
function subjectChanged(existing, local) {
	return (
		existing.name !== local.name ||
		existing.display_order !== local.display_order ||
		existing.description !== local.description
	);
}

function collectionChanged(existing, local) {
	return (
		existing.subject_id !== local.subject_id ||
		existing.name !== local.name ||
		existing.display_order !== local.display_order
	);
}

function questionChanged(existing, local) {
	// existing.answers is a JSON string from DB, local.answers is an array
	// Normalize both to strings for comparison
	const existingAnswers =
		typeof existing.answers === 'string' ? existing.answers : JSON.stringify(existing.answers);
	const localAnswers =
		typeof local.answers === 'string' ? local.answers : JSON.stringify(local.answers);

	return (
		existing.collection_id !== local.collection_id ||
		existing.question_text !== local.question_text ||
		existing.question_text_en !== local.question_text_en ||
		existing.question_text_vi !== local.question_text_vi ||
		existing.question_type !== local.question_type ||
		existingAnswers !== localAnswers ||
		(existing.image_url || null) !== (local.image_url || null)
	);
}

// --- Main Sync Function ---
async function run() {
	const startTime = Date.now();

	try {
		if (FLAGS.dryRun) {
			console.log('\n DRY RUN - No changes will be made\n');
		}

		// Clean mode: drop everything first
		if (FLAGS.clean) {
			log('Dropping all tables (--clean mode)...');
			if (!FLAGS.dryRun) {
				await dropAllTables();
			}
		}

		// Ensure tables exist
		log('Ensuring tables exist...');
		if (!FLAGS.dryRun) {
			await ensureTables();
		}

		// Scan local files
		log('Scanning subjects/ directory...\n');
		const local = scanSubjectsDirectory();

		// Get existing data from database
		let existingSubjects = new Map();
		let existingCollections = new Map();
		let existingQuestions = new Map();

		if (!FLAGS.clean) {
			existingSubjects = await getExistingSubjects();
			existingCollections = await getExistingCollections();
			existingQuestions = await getExistingQuestions();
		}

		// Track what we've processed (for deletion detection)
		const processedSubjects = new Set();
		const processedCollections = new Set();
		const processedQuestions = new Set();

		// --- Sync Subjects ---
		for (const [subjectId, localSubject] of local.subjects) {
			processedSubjects.add(subjectId);
			const existing = existingSubjects.get(subjectId);

			if (!existing) {
				log(`  [ADD] Subject: ${localSubject.name} (${subjectId})`);
				await upsertSubject(
					subjectId,
					localSubject.name,
					localSubject.display_order,
					localSubject.description
				);
				stats.subjects.added++;
			} else if (subjectChanged(existing, localSubject)) {
				log(`  [UPDATE] Subject: ${localSubject.name} (${subjectId})`, 'verbose');
				await upsertSubject(
					subjectId,
					localSubject.name,
					localSubject.display_order,
					localSubject.description
				);
				stats.subjects.updated++;
			} else {
				log(`  [SKIP] Subject: ${localSubject.name} (no changes)`, 'verbose');
			}
		}

		// --- Sync Collections ---
		for (const [collectionId, localCollection] of local.collections) {
			processedCollections.add(collectionId);
			const existing = existingCollections.get(collectionId);

			if (!existing) {
				const questionCount = [...local.questions.values()].filter(
					(q) => q.collection_id === collectionId
				).length;
				log(`  [ADD] Collection: ${localCollection.name} (${questionCount} questions)`);
				await upsertCollection(
					collectionId,
					localCollection.subject_id,
					localCollection.name,
					localCollection.display_order
				);
				stats.collections.added++;
			} else if (collectionChanged(existing, localCollection)) {
				log(`  [UPDATE] Collection: ${localCollection.name}`, 'verbose');
				await upsertCollection(
					collectionId,
					localCollection.subject_id,
					localCollection.name,
					localCollection.display_order
				);
				stats.collections.updated++;
			} else {
				log(`  [SKIP] Collection: ${localCollection.name} (no changes)`, 'verbose');
			}
		}

		// --- Sync Questions ---
		if (FLAGS.clean) {
			const allQuestions = [...local.questions.values()];
			const BATCH_SIZE = 200;
			for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
				const batch = allQuestions.slice(i, i + BATCH_SIZE);
				log(`  [BATCH] Questions ${i + 1}..${Math.min(i + BATCH_SIZE, allQuestions.length)}`, 'verbose');
				await upsertQuestionsBatch(batch);
				stats.questions.added += batch.length;
			}
		} else {
			for (const [questionId, localQuestion] of local.questions) {
				processedQuestions.add(questionId);
				const existing = existingQuestions.get(questionId);

				if (!existing) {
					log(`    [ADD] Question: ${questionId}`, 'verbose');
					await upsertQuestion(localQuestion, localQuestion.collection_id);
					stats.questions.added++;
				} else if (questionChanged(existing, localQuestion)) {
					log(`    [UPDATE] Question: ${questionId}`, 'verbose');
					await upsertQuestion(localQuestion, localQuestion.collection_id);
					stats.questions.updated++;
				} else {
					log(`    [SKIP] Question: ${questionId} (no changes)`, 'verbose');
				}
			}
		}

		// --- Deletion Detection ---
		if (!FLAGS.noDelete && !FLAGS.clean) {
			// Delete orphaned questions
			for (const [questionId] of existingQuestions) {
				if (!processedQuestions.has(questionId)) {
					log(`  [DELETE] Question: ${questionId}`);
					await deleteQuestion(questionId);
					stats.questions.deleted++;
				}
			}

			// Delete orphaned collections
			for (const [collectionId, collection] of existingCollections) {
				if (!processedCollections.has(collectionId)) {
					log(`  [DELETE] Collection: ${collection.name} (${collectionId})`);
					await deleteCollection(collectionId);
					stats.collections.deleted++;
				}
			}

			// Delete orphaned subjects
			for (const [subjectId, subject] of existingSubjects) {
				if (!processedSubjects.has(subjectId)) {
					log(`  [DELETE] Subject: ${subject.name} (${subjectId})`);
					await deleteSubject(subjectId);
					stats.subjects.deleted++;
				}
			}
		}

		// --- Summary ---
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log('\n--- Summary ---');
		console.log(
			`  Subjects:    ${stats.subjects.added} added, ${stats.subjects.updated} updated, ${stats.subjects.deleted} deleted`
		);
		console.log(
			`  Collections: ${stats.collections.added} added, ${stats.collections.updated} updated, ${stats.collections.deleted} deleted`
		);
		console.log(
			`  Questions:   ${stats.questions.added} added, ${stats.questions.updated} updated, ${stats.questions.deleted} deleted`
		);
		console.log(`\nSync complete! (${elapsed}s)`);

		if (FLAGS.dryRun) {
			console.log('\nRun without --dry-run to apply changes.');
		}
	} catch (err) {
		console.error('Sync failed:', err);
		process.exit(1);
	}
}

run();
