<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import {
		pageState,
		favorites,
		uiState,
		appState,
		clearQuiz,
		setCurrentView
	} from './global.svelte';

	$effect(() => {
		const btns = document.querySelectorAll('.sidebar-btn');
		const btn = btns[pageState.current] as HTMLElement | undefined;
		if (btn) {
			btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
		}
	});

	function handleQuestionClick(idx: number) {
		pageState.current = idx;
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			uiState.sidebarOpen = false;
		}
	}

	function handleBackToLibrary() {
		// If in favorites view, switch back to 'all' view first
		if (appState.currentView === 'favorites') {
			setCurrentView('all');
		}
		clearQuiz();
	}
</script>

<div
	class="sidebar flex flex-col h-screen bg-[var(--bg-surface)] w-full border-r border-[var(--border)]"
>
	<!-- Header with close button -->
	<div class="flex items-center justify-between p-3 border-b border-[var(--border)]">
		<button
			class="flex items-center gap-2 text-[var(--color-primary)] hover:bg-[var(--bg-hover)] px-2 py-1.5 rounded-lg transition-colors font-semibold text-sm"
			onclick={handleBackToLibrary}
		>
			<ArrowLeft size={18} />
			Back to Library
		</button>
		<button
			class="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
			aria-label="Close sidebar"
			onclick={() => (uiState.sidebarOpen = false)}
		>
			<X size={18} />
		</button>
	</div>

	<!-- Question list -->
	<!-- stopPropagation prevents wheel events from triggering quiz navigation -->
	<div
		class="main-scrollbar flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1"
		onwheel={(e) => e.stopPropagation()}
	>
		{#each pageState.quizData as q, idx (q.question_id)}
			<button
				class="cursor-pointer sidebar-btn flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors {idx ===
				pageState.current
					? 'bg-[var(--color-primary)] text-[var(--bg-primary)] font-bold'
					: 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}"
				onclick={() => handleQuestionClick(idx)}
			>
				<span>Question {idx + 1}</span>
				{#if favorites.has(q.question_id)}
					<Star fill="var(--color-accent)" color="var(--color-accent)" size={16} />
				{/if}
			</button>
		{/each}
	</div>
</div>
