// Centralized main page state for Sidebar, TopBar, QuizCard, FavoritesModal

import {
	DEFAULT_FAVORITES_LOCAL,
	STYLE_KEY,
	FONT_KEY,
	EN_SIZE_KEY,
	EN_OPACITY_KEY,
	TIMER_ENABLED_KEY,
	SOUND_ENABLED_KEY,
	FOCUS_MODE_KEY,
	HAPTIC_ENABLED_KEY,
	HIGH_SCORES_KEY,
	QUIZ_PROGRESS_PREFIX,
	WRONG_QUESTIONS_PREFIX
} from '../lib/localKeys';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import { replaceState } from '$app/navigation';
import { resolve } from '$app/paths';
import {
	DEFAULT_STYLE,
	DEFAULT_FONT,
	FONTS,
	STYLES,
	type StyleKey,
	type FontId
} from '../lib/theme';

export type Quiz = {
	question_id: string;
	question_text: string;
	question_type: string;
	answers: string[];
	image_url?: string | null;
	[key: string]: unknown;
};

export type AppState = {
	currentView: 'all' | 'favorites';
	all: { module: string; questionIndex: number };
	favorites: { module: string; questionIndex: number };
};

export type PageState = {
	quizData: Quiz[];
	current: number;
	questionAnswers: Map<string, number[]>;
	questionLocked: boolean;
	questionLockedStatus: Map<string, boolean>;
	isLoading: boolean;
	moduleId: string; // Current module ID for the quiz
};

export const pageState = $state<PageState>({
	quizData: [],
	current: 0,
	questionAnswers: new SvelteMap(),
	questionLocked: false,
	questionLockedStatus: new SvelteMap(),
	isLoading: false,
	moduleId: ''
});

export const favorites = new SvelteSet<string>();

// Quiz session score/streak tracking
export const quizSession = $state<{
	correct: number;
	wrong: number;
	streak: number;
	maxStreak: number;
}>({
	correct: 0,
	wrong: 0,
	streak: 0,
	maxStreak: 0
});

export const questionResults = new SvelteMap<string, boolean>();

export function trackResult(questionId: string, isCorrect: boolean) {
	questionResults.set(questionId, isCorrect);
	if (isCorrect) {
		quizSession.correct++;
		quizSession.streak++;
		if (quizSession.streak > quizSession.maxStreak) {
			quizSession.maxStreak = quizSession.streak;
		}
	} else {
		quizSession.wrong++;
		quizSession.streak = 0;
	}
}

export function resetQuizSession() {
	quizSession.correct = 0;
	quizSession.wrong = 0;
	quizSession.streak = 0;
	quizSession.maxStreak = 0;
	questionResults.clear();
}

export const appState = $state<AppState>({
	currentView: 'all',
	all: { module: '', questionIndex: 0 },
	favorites: { ...DEFAULT_FAVORITES_LOCAL }
});

export function setCurrentView(newView: 'all' | 'favorites') {
	appState.currentView = newView;
	if (newView === 'favorites') {
		pageState.questionAnswers.clear();
		pageState.questionLockedStatus.clear();
	}
}

export type QuizNav = {
	id: string;
	name: string;
	display_order: number;
};

export type SubjectNav = {
	id: string;
	name: string;
	display_order: number;
	description: string;
	quizzes: QuizNav[];
};

export const uiState = $state<{
	sidebarOpen: boolean;
	showFavModal: boolean;
	showShortcutsModal: boolean;
	showSettingsModal: boolean;
	sidebarMode: 'library' | 'questions';
	navigation: SubjectNav[];
}>({
	sidebarOpen: false,
	showFavModal: false,
	showShortcutsModal: false,
	showSettingsModal: false,
	sidebarMode: 'library',
	navigation: []
});

export function getFavIdList() {
	return Array.from(favorites).join(', ');
}

export const isInitialLoad = $state<boolean>(true);

export const moduleQuizCache = new SvelteMap<string, Quiz[]>();

export function getCurrentQuestion(): Quiz | undefined {
	return pageState.quizData[pageState.current];
}

export function getAnswers(): { answer_text: string }[] {
	const q = getCurrentQuestion();
	return q && Array.isArray(q.answers)
		? q.answers.map((a) => (typeof a === 'object' && a !== null ? a : { answer_text: String(a) }))
		: [];
}

export async function fetchNavigation() {
	try {
		const res = await fetch('/api/nav');
		const data = await res.json();
		if (data.subjects) {
			uiState.navigation = data.subjects;
		}
	} catch (err) {
		console.error('Failed to fetch navigation:', err);
	}
}

export async function loadQuiz(quizId: string, restore = false) {
	pageState.isLoading = true;
	resetQuizSession();
	try {
		const res = await fetch(`/api/quiz?id=${quizId}`);
		const data = await res.json();
		if (data.quizzes) {
			pageState.quizData = data.quizzes;
			pageState.moduleId = quizId;
			pageState.current = 0;
			pageState.questionAnswers.clear();
			pageState.questionLockedStatus.clear();
			uiState.sidebarMode = 'questions';
			// Restore progress if requested
			if (restore) {
				restoreQuizProgress(quizId);
			}
			// Open sidebar on desktop when loading a quiz
			if (typeof window !== 'undefined' && window.innerWidth >= 768) {
				uiState.sidebarOpen = true;
			}
		}
	} catch (err) {
		console.error('Failed to load quiz:', err);
	} finally {
		pageState.isLoading = false;
	}
}

export function clearQuiz() {
	pageState.quizData = [];
	resetQuizSession();
	pageState.moduleId = '';
	pageState.current = 0;
	pageState.questionAnswers.clear();
	pageState.questionLockedStatus.clear();
	pageState.questionLocked = false;
	uiState.sidebarMode = 'library';
	uiState.sidebarOpen = false;
	// Clear URL when returning to library
	if (typeof window !== 'undefined') {
		setTimeout(() => replaceState(resolve('/'), {}), 0);
	}
}

// Style and Font State
function getInitialStyle(): StyleKey {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(STYLE_KEY);
		if (stored && stored in STYLES) {
			return stored as StyleKey;
		}
	}
	return DEFAULT_STYLE;
}

function getInitialFont(): FontId {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(FONT_KEY);
		if (stored && FONTS.some((f) => f.id === stored)) {
			return stored as FontId;
		}
	}
	return DEFAULT_FONT;
}

export const styleState = $state<{ style: StyleKey; font: FontId }>({
	style: getInitialStyle(),
	font: getInitialFont()
});

export function setStyle(style: StyleKey) {
	styleState.style = style;
	if (typeof window !== 'undefined') {
		localStorage.setItem(STYLE_KEY, style);
		document.documentElement.setAttribute('data-style', style);
	}
}

export function setFont(font: FontId) {
	styleState.font = font;
	if (typeof window !== 'undefined') {
		localStorage.setItem(FONT_KEY, font);
		const fontDef = FONTS.find((f) => f.id === font);
		if (fontDef) {
			document.documentElement.style.setProperty('--font-family', fontDef.family);
		}
	}
}

// English Text Display Settings
function getInitialEnSize(): number {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(EN_SIZE_KEY);
		if (stored) return parseInt(stored, 10);
	}
	return 12; // default text-xs
}

function getInitialEnOpacity(): number {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(EN_OPACITY_KEY);
		if (stored) return parseFloat(stored);
	}
	return 0.4; // default opacity-40
}

export const enStyleState = $state<{ size: number; opacity: number }>({
	size: getInitialEnSize(),
	opacity: getInitialEnOpacity()
});

export function setEnSize(size: number) {
	enStyleState.size = size;
	if (typeof window !== 'undefined') {
		localStorage.setItem(EN_SIZE_KEY, size.toString());
	}
}

export function setEnOpacity(opacity: number) {
	enStyleState.opacity = opacity;
	if (typeof window !== 'undefined') {
		localStorage.setItem(EN_OPACITY_KEY, opacity.toString());
	}
}

// ===== Quiz Settings (Timer, Sound, Focus, Haptic) =====
function getInitialToggle(key: string, defaultValue: boolean): boolean {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(key);
		if (stored !== null) return stored === 'true';
	}
	return defaultValue;
}

function setToggle(key: string, value: boolean) {
	if (typeof window !== 'undefined') {
		localStorage.setItem(key, String(value));
	}
}

export const timerEnabled = $state({ value: getInitialToggle(TIMER_ENABLED_KEY, false) });
export const soundEnabled = $state({ value: getInitialToggle(SOUND_ENABLED_KEY, true) });
export const focusMode = $state({ value: getInitialToggle(FOCUS_MODE_KEY, false) });
export const hapticEnabled = $state({ value: getInitialToggle(HAPTIC_ENABLED_KEY, true) });

export function setTimerEnabled(v: boolean) { timerEnabled.value = v; setToggle(TIMER_ENABLED_KEY, v); }
export function setSoundEnabled(v: boolean) { soundEnabled.value = v; setToggle(SOUND_ENABLED_KEY, v); }
export function setFocusMode(v: boolean) { focusMode.value = v; setToggle(FOCUS_MODE_KEY, v); }
export function setHapticEnabled(v: boolean) { hapticEnabled.value = v; setToggle(HAPTIC_ENABLED_KEY, v); }

// ===== High Scores (per module) =====
export type ModuleScore = { correct: number; wrong: number; accuracy: number; date: string };
export const highScores = $state<Record<string, ModuleScore>>({});

function getInitialHighScores(): Record<string, ModuleScore> {
	if (typeof window !== 'undefined') {
		try {
			const d = localStorage.getItem(HIGH_SCORES_KEY);
			if (d) return JSON.parse(d);
		} catch { /* ignore */ }
	}
	return {};
}

// Hydrate high scores on module init
Object.assign(highScores, getInitialHighScores());

export function saveHighScore(moduleId: string, correct: number, wrong: number) {
	const total = correct + wrong;
	if (total === 0) return;
	const accuracy = Math.round((correct / total) * 100);
	const existing = highScores[moduleId];
	if (!existing || correct > existing.correct || (correct === existing.correct && accuracy > existing.accuracy)) {
		highScores[moduleId] = { correct, wrong, accuracy, date: new Date().toISOString().slice(0, 10) };
		if (typeof window !== 'undefined') {
			localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
		}
	}
}

// ===== Spaced Repetition (wrong question tracking) =====
export const wrongQuestions = $state<Record<string, string[]>>({});

export function trackWrongQuestion(moduleId: string, questionId: string) {
	if (!wrongQuestions[moduleId]) wrongQuestions[moduleId] = [];
	if (!wrongQuestions[moduleId].includes(questionId)) {
		wrongQuestions[moduleId].push(questionId);
		if (typeof window !== 'undefined') {
			localStorage.setItem(WRONG_QUESTIONS_PREFIX + moduleId, JSON.stringify(wrongQuestions[moduleId]));
		}
	}
}

function getInitialWrongQuestions(moduleId: string): string[] {
	if (typeof window !== 'undefined') {
		try {
			const d = localStorage.getItem(WRONG_QUESTIONS_PREFIX + moduleId);
			if (d) return JSON.parse(d);
		} catch { /* ignore */ }
	}
	return [];
}

export function getWrongQuestionIds(moduleId: string): string[] {
	return wrongQuestions[moduleId] ?? getInitialWrongQuestions(moduleId);
}

// ===== Quiz Progress Persistence =====
export function saveQuizProgress() {
	if (typeof window === 'undefined') return;
	if (!pageState.moduleId || pageState.quizData.length === 0) return;
	const key = QUIZ_PROGRESS_PREFIX + pageState.moduleId;
	const progress = {
		current: pageState.current,
		answers: Array.from(pageState.questionAnswers.entries()),
		lockedStatus: Array.from(pageState.questionLockedStatus.entries()),
		score: { correct: quizSession.correct, wrong: quizSession.wrong, streak: quizSession.streak, maxStreak: quizSession.maxStreak }
	};
	localStorage.setItem(key, JSON.stringify(progress));
}

export function restoreQuizProgress(moduleId: string): boolean {
	if (typeof window === 'undefined') return false;
	const key = QUIZ_PROGRESS_PREFIX + moduleId;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return false;
		const saved = JSON.parse(raw);
		if (saved.current !== undefined) {
			pageState.current = saved.current;
			if (saved.answers) {
				for (const [qid, ans] of saved.answers) {
					pageState.questionAnswers.set(qid, ans);
				}
			}
			if (saved.lockedStatus) {
				for (const [qid, locked] of saved.lockedStatus) {
					pageState.questionLockedStatus.set(qid, locked);
				}
			}
			if (saved.score) {
				quizSession.correct = saved.score.correct ?? 0;
				quizSession.wrong = saved.score.wrong ?? 0;
				quizSession.streak = saved.score.streak ?? 0;
				quizSession.maxStreak = saved.score.maxStreak ?? 0;
			}
			return true;
		}
	} catch { /* ignore */ }
	return false;
}

export function clearQuizProgress(moduleId: string) {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(QUIZ_PROGRESS_PREFIX + moduleId);
	}
}
