<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Sidebar from './Sidebar.svelte';
	import TopBar from './TopBar.svelte';
	import Carousel from './Carousel.svelte';
	import LibraryGrid from './LibraryGrid.svelte';
	import FavoritesModal from './FavoritesModal.svelte';
	import ShortcutsModal from './ShortcutsModal.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import {
		DEFAULT_FAVORITES_LOCAL,
		CURRENT_VIEW_KEY,
		FAVORITE_QUESTIONS_KEY,
		APPSTATE_ALL_KEY
	} from '../lib/localKeys';
	import type { Quiz } from './global.svelte';
	import {
		pageState,
		favorites,
		appState,
		uiState,
		setCurrentView,
		fetchNavigation,
		loadQuiz,
		focusMode,
		saveQuizProgress
	} from './global.svelte';

	let isInitialLoad = $state(true);
	let routerReady = $state(false);

	onMount(() => {
		routerReady = true;
		fetchNavigation();
		if (appState.currentView === 'favorites') {
			showFavorites();
		}
		isInitialLoad = false;
	});

	// Store previous quiz state before entering favorites
	let previousQuizState = $state<{
		quizData: Quiz[];
		moduleId: string;
		current: number;
	} | null>(null);

	// Confirmation modal state
	let showClearConfirm = $state(false);

	async function showFavorites() {
		if (typeof window !== 'undefined') {
			// Save current quiz state before switching to favorites
			if (pageState.quizData.length > 0 && appState.currentView === 'all') {
				previousQuizState = {
					quizData: [...pageState.quizData],
					moduleId: pageState.moduleId,
					current: pageState.current
				};
			}

			localStorage.setItem(CURRENT_VIEW_KEY, 'favorites');
			setCurrentView('favorites');
			const favQuestionsRaw = localStorage.getItem(FAVORITE_QUESTIONS_KEY);
			const favIdsArr = favQuestionsRaw ? JSON.parse(favQuestionsRaw) : [];
			if (!Array.isArray(favIdsArr) || favIdsArr.length === 0) {
				pageState.quizData = [];
				pageState.current = 0;
			} else {
				pageState.isLoading = true;
				const res = await fetch('/api/module', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids: favIdsArr })
				});
				const data = await res.json();
				pageState.quizData = Array.isArray(data.quizzes)
					? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
					: [];
				pageState.isLoading = false;
				pageState.current = 0;
			}
		}
	}

	function onBackToAll() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(CURRENT_VIEW_KEY, 'all');
			setCurrentView('all');

			// Restore previous quiz state if it exists
			if (previousQuizState) {
				pageState.quizData = previousQuizState.quizData;
				pageState.moduleId = previousQuizState.moduleId;
				pageState.current = previousQuizState.current;
				uiState.sidebarMode = 'questions';
				previousQuizState = null;
			} else {
				// No previous quiz, go to library
				pageState.quizData = [];
				pageState.moduleId = '';
				uiState.sidebarMode = 'library';
			}
		}
	}

	function onClearFavorites() {
		showClearConfirm = true;
	}

	function confirmClearFavorites() {
		favorites.clear();
		if (typeof window !== 'undefined') {
			localStorage.setItem(FAVORITE_QUESTIONS_KEY, '[]');
		}
		if (appState.currentView === 'favorites') {
			localStorage.setItem(CURRENT_VIEW_KEY, 'all');
			setCurrentView('all');

			// Restore previous quiz state if it exists
			if (previousQuizState) {
				pageState.quizData = previousQuizState.quizData;
				pageState.moduleId = previousQuizState.moduleId;
				pageState.current = previousQuizState.current;
				uiState.sidebarMode = 'questions';
				previousQuizState = null;
			} else {
				// No previous quiz, go to library
				pageState.quizData = [];
				pageState.moduleId = '';
				uiState.sidebarMode = 'library';
			}
		}
		showClearConfirm = false;
	}

	function cancelClearFavorites() {
		showClearConfirm = false;
	}

	function handleKeyNavigation(e: KeyboardEvent) {
		if (
			document.activeElement &&
			['INPUT', 'SELECT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)
		)
			return;
		if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
			if (pageState.current < pageState.quizData.length - 1) {
				pageState.current += 1;
				pageState.questionAnswers.clear();
				pageState.questionLockedStatus.clear();
				pageState.questionLocked = false;
				saveQuizProgress();
			}
		} else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
			if (pageState.current > 0) {
				pageState.current -= 1;
				pageState.questionAnswers.clear();
				pageState.questionLockedStatus.clear();
				pageState.questionLocked = false;
				saveQuizProgress();
			}
		}
	}

	// Throttled wheel navigation for desktop users
	let lastWheelTime = 0;
	const WHEEL_THROTTLE_MS = 250;

	function handleWheelNavigation(e: WheelEvent) {
		// Skip if user is in an input field
		if (
			document.activeElement &&
			['INPUT', 'SELECT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)
		)
			return;

		// Throttle to prevent rapid navigation
		const now = Date.now();
		if (now - lastWheelTime < WHEEL_THROTTLE_MS) return;

		// Only navigate on significant scroll
		if (Math.abs(e.deltaY) < 10) return;

		if (e.deltaY > 0) {
			// Scroll down = next question
			if (pageState.current < pageState.quizData.length - 1) {
				pageState.current += 1;
				pageState.questionAnswers.clear();
				pageState.questionLockedStatus.clear();
				pageState.questionLocked = false;
				lastWheelTime = now;
				saveQuizProgress();
			}
		} else if (e.deltaY < 0) {
			// Scroll up = previous question
			if (pageState.current > 0) {
				pageState.current -= 1;
				pageState.questionAnswers.clear();
				pageState.questionLockedStatus.clear();
				pageState.questionLocked = false;
				lastWheelTime = now;
				saveQuizProgress();
			}
		}
	}

	$effect(() => {
		localStorage.setItem(FAVORITE_QUESTIONS_KEY, JSON.stringify(Array.from(favorites)));
	});

	// Auto-save current state
	$effect(() => {
		if (appState.currentView === 'all' && pageState.moduleId) {
			localStorage.setItem(
				APPSTATE_ALL_KEY,
				JSON.stringify({
					module: pageState.moduleId,
					questionIndex: pageState.current
				})
			);
		}
	});

	// Auto-save progress when current question changes
	$effect(() => {
		if (pageState.quizData.length > 0 && pageState.moduleId) {
			// Use a microtask to avoid saving during initial load
			if (!isInitialLoad) {
				saveQuizProgress();
			}
		}
	});

	// Sync state to URL (replaceState so back button doesn't cycle through questions)
	$effect(() => {
		if (!routerReady || isInitialLoad) return;

		const params = new SvelteURLSearchParams();

		if (appState.currentView === 'favorites') {
			params.set('view', 'favorites');
			if (pageState.quizData.length > 0 && pageState.current >= 0) {
				params.set('q', String(pageState.current + 1)); // 1-based for user-friendliness
			}
		} else if (pageState.moduleId) {
			params.set('quiz', pageState.moduleId);
			params.set('q', String(pageState.current + 1)); // 1-based
		}

		const newSearch = params.toString() ? `?${params.toString()}` : '';
		const currentSearch = window.location.search;

		// Only update if URL actually changed
		if (currentSearch !== newSearch) {
			if (newSearch) {
				// Shallow routing: update only the query string (SvelteKit-supported).
				// The lint rule can't statically recognize query-only shallow routing, so disable it here.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				setTimeout(() => replaceState(newSearch, {}), 0);
			} else {
				setTimeout(() => replaceState(resolve('/'), {}), 0);
			}
		}
	});

	// Initial load state restoration
	if (typeof window !== 'undefined') {
		const favArr = JSON.parse(localStorage.getItem(FAVORITE_QUESTIONS_KEY) || '[]');
		favorites.clear();
		for (const id of favArr) favorites.add(id);

		// Parse URL params on initial load
		const urlParams = new URLSearchParams(window.location.search);
		const urlQuiz = urlParams.get('quiz');
		const urlQ = urlParams.get('q');
		const urlView = urlParams.get('view');

		// URL takes priority over localStorage for view/quiz state
		if (urlView === 'favorites') {
			setCurrentView('favorites');
		} else if (urlQuiz) {
			setCurrentView('all');
			// Load quiz from URL, then navigate to question, with restore
			loadQuiz(urlQuiz, true).then(() => {
				if (urlQ) {
					const qIndex = parseInt(urlQ, 10) - 1; // Convert 1-based to 0-based
					if (qIndex >= 0 && qIndex < pageState.quizData.length) {
						pageState.current = qIndex;
					}
				}
			});
		} else {
			// No URL params, use localStorage
			const currentView = (localStorage.getItem(CURRENT_VIEW_KEY) as 'all' | 'favorites') || 'all';
			setCurrentView(currentView);
		}
	}

	// Focus mode: hide sidebar and chrome
	let showTopBar = $derived(pageState.quizData.length === 0 || !focusMode.value || appState.currentView !== 'all');
</script>

<!-- Main Layout -->
<svelte:window onkeydown={handleKeyNavigation} onwheel={handleWheelNavigation} />
<div
	class="flex h-screen min-w-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans"
>
	<!-- Sidebar (only show when quiz is loaded, hidden in focus mode) -->
	{#if uiState.sidebarOpen && pageState.quizData.length > 0 && !focusMode.value}
		<div
			class="fixed top-0 left-0 h-full z-40 bg-[var(--bg-surface)] transition-transform duration-200 ease-in-out
							md:static md:translate-x-0 md:min-w-[200px] md:w-[300px]"
		>
			<Sidebar />
		</div>
	{/if}

	<!-- Backdrop (mobile only) -->
	{#if uiState.sidebarOpen && pageState.quizData.length > 0 && typeof window !== 'undefined' && window.innerWidth < 768 && !focusMode.value}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 z-30"
			onclick={() => (uiState.sidebarOpen = false)}
			aria-label="Tap outside to close sidebar"
		></button>
	{/if}

	<!-- Main Content Wrapper -->
	<div id="main-content-wrapper" class="flex-1 flex flex-col min-h-0 min-w-0" class:focus-active={focusMode.value && pageState.quizData.length > 0}>
		<!-- Top Bar (hidden in focus mode during quiz) -->
		{#if showTopBar}
			<div class="w-full relative z-10 flex-shrink-0">
				{#if typeof window !== 'undefined'}
					<TopBar {showFavorites} {onBackToAll} {onClearFavorites} />
				{/if}
			</div>
		{/if}

		<!-- Main Content -->
		<div
			id="main-content"
			class="flex-1 min-h-0 flex flex-col items-center justify-start relative overflow-hidden"
			class:focus-card-container={focusMode.value && pageState.quizData.length > 0}
		>
			{#if pageState.isLoading}
				<!-- Loading Overlay -->
				<div
					class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 pointer-events-auto select-none"
				>
					<svg
						class="animate-spin h-16 w-16 text-[var(--color-primary)]"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
						></path>
					</svg>
				</div>
			{/if}

			{#if pageState.quizData.length > 0}
				<!-- Quiz View -->
				<div
					class="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
				>
					<Carousel />
				</div>
			{:else if appState.currentView === 'all'}
				<!-- Library View -->
				<LibraryGrid />
			{:else}
				<!-- Favorites empty state -->
				<div class="w-full h-full flex flex-col items-center justify-center p-8">
					<div class="text-[var(--text-secondary)] text-lg mb-4">No favorite questions yet</div>
					<p class="text-[var(--text-secondary)] text-sm text-center mb-6 max-w-md">
						Star questions while taking quizzes to save them here for quick review
					</p>
					<button
						class="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--bg-primary)] font-semibold"
						onclick={() => {
							setCurrentView('all');
						}}
					>
						Browse Quizzes
					</button>
				</div>
			{/if}
		</div>
	</div>
	<!-- Floating Favorites ID Button and Modal -->
	{#if pageState.quizData.length === 0}
	<button
		id="fav-id-fab"
		class="cursor-pointer fav-id-fab fixed bottom-6 right-6 z-[1000] bg-[var(--color-primary)] text-[var(--bg-primary)] rounded-full w-14 h-14 shadow-lg text-2xl flex items-center justify-center hover:opacity-80"
		onclick={() => (uiState.showFavModal = true)}
	>
		★
	</button>
	{/if}
	<FavoritesModal />
	<ShortcutsModal />
	<SettingsModal />

	<!-- Clear Favorites Confirmation Modal -->
	{#if showClearConfirm}
		<div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60">
			<div
				class="bg-[var(--bg-surface)] rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-[var(--border)]"
			>
				<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Clear all favorites?</h3>
				<p class="text-[var(--text-secondary)] text-sm mb-6">
					This will remove all your favorited questions. This cannot be undone.
				</p>
				<div class="flex gap-3 justify-end">
					<button
						class="px-4 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium hover:bg-[var(--border)] transition-colors"
						onclick={cancelClearFavorites}
					>
						Cancel
					</button>
					<button
						class="px-4 py-2 rounded-lg bg-[var(--color-error)] text-white font-medium hover:opacity-90 transition-opacity"
						onclick={confirmClearFavorites}
					>
						Clear All
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
<style>
</style>

