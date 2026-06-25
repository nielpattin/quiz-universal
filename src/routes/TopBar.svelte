<script lang="ts">
	import { uiState, appState, pageState, clearQuiz } from './global.svelte';
	import {
		ChevronRight,
		Menu,
		Star,
		ArrowLeft,
		Trash2,
		BookOpen,
		CircleHelp,
		Settings
	} from '@lucide/svelte';

	interface Props {
		showFavorites: () => void;
		onBackToAll: () => void;
		onClearFavorites: () => void;
	}

	let { showFavorites, onBackToAll, onClearFavorites }: Props = $props();

	// Check if we're on library view (no quiz loaded and not in favorites)
	let isLibraryView = $derived(pageState.quizData.length === 0 && appState.currentView === 'all');

	function handleFavoritesClick() {
		showFavorites();
	}
	function handleBackClick() {
		if (onBackToAll) {
			onBackToAll();
		}
	}
	function handleClearFavorites() {
		if (onClearFavorites) {
			onClearFavorites();
		}
	}

	let currentSubject = $derived(
		uiState.navigation.find((s) => s.quizzes.some((q) => q.id === pageState.moduleId))
	);
	let currentQuiz = $derived(currentSubject?.quizzes.find((q) => q.id === pageState.moduleId));
</script>

<div
	class="top-bar flex flex-row items-center justify-between gap-2 px-3 py-2.5 md:px-4 md:py-3 flex-shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border)]"
>
	<!-- Left: Hamburger + Breadcrumbs -->
	<div class="flex items-center gap-2 min-w-0 flex-1">
		<!-- Hamburger (only show when quiz is loaded) -->
		{#if !uiState.sidebarOpen && pageState.quizData.length > 0}
			<button
				class="flex-shrink-0 bg-[var(--color-primary)] rounded-lg w-11 h-11 flex items-center justify-center"
				aria-label="Open sidebar"
				onclick={() => (uiState.sidebarOpen = true)}
			>
				<Menu size={20} class="text-[var(--bg-primary)]" />
			</button>
		{/if}

		<!-- Title / Breadcrumbs -->
		<div class="flex items-center gap-1.5 min-w-0">
			{#if isLibraryView}
				<!-- Library View Title -->
				<BookOpen size={20} class="text-[var(--color-primary)] flex-shrink-0" />
				<span class="text-[var(--color-primary)] font-semibold text-sm md:text-base"
					>Quiz Library</span
				>
			{:else if currentSubject}
				<!-- Desktop: Full breadcrumb -->
				<button
					class="hidden md:inline text-[var(--text-secondary)] text-sm whitespace-nowrap hover:text-[var(--color-primary)] hover:underline cursor-pointer"
					onclick={() => clearQuiz()}
				>
					{currentSubject.name}
				</button>
				<ChevronRight size={14} class="hidden md:block text-[var(--border)] flex-shrink-0" />
				<!-- Quiz name (always shown) -->
				<span class="text-[var(--color-primary)] font-semibold text-sm truncate">
					{currentQuiz?.name || 'Quiz'}
				</span>
			{:else if appState.currentView === 'favorites'}
				<Star size={18} class="text-[var(--color-primary)] flex-shrink-0" />
				<span class="text-[var(--color-primary)] font-semibold text-sm">Favorites</span>
			{:else}
				<span class="text-[var(--text-secondary)] text-sm">Loading...</span>
			{/if}
		</div>
	</div>

	<!-- Right: Actions -->
	<div class="flex gap-1.5 md:gap-2 items-center flex-shrink-0">
		<!-- Help button -->
		<button
			class="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--color-primary)] hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
			onclick={() => (uiState.showShortcutsModal = true)}
			aria-label="Tips and gestures"
			title="Tips and gestures"
		>
			<CircleHelp size={18} />
		</button>

		<!-- Settings button -->
		<button
			class="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--color-primary)] hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
			onclick={() => (uiState.showSettingsModal = true)}
			aria-label="Settings"
			title="Settings"
		>
			<Settings size={18} />
		</button>

		{#if appState.currentView === 'all'}
			<!-- Mobile: Icon only -->
			<button
				class="md:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--bg-primary)]"
				onclick={handleFavoritesClick}
				aria-label="View favorites"
			>
				<Star size={18} />
			</button>
			<!-- Desktop: Text button -->
			<button
				class="hidden md:block cursor-pointer rounded-md px-3 py-1.5 bg-[var(--color-primary)] text-[var(--bg-primary)] text-sm font-bold transition-transform active:scale-95"
				onclick={handleFavoritesClick}
			>
				Favorites
			</button>
		{:else}
			<!-- Mobile: Icon buttons -->
			<button
				class="md:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--bg-primary)]"
				onclick={handleBackClick}
				aria-label="Go back"
			>
				<ArrowLeft size={18} />
			</button>
			<button
				class="md:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--color-error)] border border-[var(--color-error)]"
				onclick={handleClearFavorites}
				aria-label="Clear favorites"
			>
				<Trash2 size={18} />
			</button>
			<!-- Desktop: Text buttons -->
			<button
				class="hidden md:block cursor-pointer rounded-md px-3 py-1.5 bg-[var(--color-primary)] text-[var(--bg-primary)] text-sm font-bold transition-transform active:scale-95"
				onclick={handleBackClick}
			>
				Back
			</button>
			<button
				class="hidden md:block cursor-pointer rounded-md px-3 py-1.5 bg-[var(--bg-hover)] text-[var(--color-error)] text-sm font-bold border border-[var(--color-error)] transition-transform active:scale-95"
				onclick={handleClearFavorites}
			>
				Clear
			</button>
		{/if}
	</div>
</div>
