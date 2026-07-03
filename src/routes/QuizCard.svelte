<script lang="ts">
	import { DEBUG } from '$lib/config';
	import BilingualText from '$lib/components/BilingualText.svelte';
	import { quizSession, type Answer, type Quiz } from './global.svelte';
	let isHeld = $state(false);
	import Star from '@lucide/svelte/icons/star';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Square from '@lucide/svelte/icons/square';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	interface CurrentQuestion extends Quiz {
		module?: string;
		question?: string; // legacy
	}

	interface QuizQuestion {
		question_id?: string;
		question_text?: string;
		question_type?: string;
		answers?: unknown[];
		[key: string]: unknown;
	}

	interface Props {
		currentQuestion: CurrentQuestion;
		current: number;
		quizData: QuizQuestion[];
		selectedAnswers: number[];
		questionLocked: boolean;
		checkAnswers: () => void;
		handleAnswerClick: (idx: number, questionType: string) => void;
		favorites: Set<string>;
		toggleFavorite: (idx: number) => void;
		answers: Answer[];
		originalIndices?: number[];
		goToPreviousCard: () => void;
		goToNextCard: () => void;
	}

	let {
		currentQuestion,
		current,
		quizData,
		selectedAnswers,
		questionLocked,
		checkAnswers,
		handleAnswerClick,
		answers,
		originalIndices,
		toggleFavorite,
		favorites,
		goToPreviousCard,
		goToNextCard,
	}: Props = $props();

	// Use reactive favorite state from props, not store
	function isFavorited(id: string) {
		return favorites.has(id);
	}

	// Track scroll position and log when reaching edges only once per edge per scroll session
	let scrollContainer: HTMLDivElement | null = null;
	const edgeState = $state({
		topLogged: false,
		bottomLogged: false
	});
	const scrollState = $state<{ value: 'top' | 'middle' | 'bottom' }>({ value: 'top' });
	const isScrollable = $state({ value: false });

	// Improved scroll detection function
	function checkScrollable() {
		if (!scrollContainer) {
			isScrollable.value = false;
			return;
		}
		const { scrollHeight, clientHeight } = scrollContainer;
		// Add small tolerance to account for subpixel rounding
		isScrollable.value = scrollHeight > clientHeight + 1;
	}

	// More reliable scroll detection using ResizeObserver
	let resizeObserver: ResizeObserver | null = null;

	$effect(() => {
		if (!scrollContainer) return;

		// Initial check after component mounts
		checkScrollable();

		// Set up ResizeObserver to detect content changes
		resizeObserver = new ResizeObserver(() => {
			checkScrollable();
		});

		resizeObserver.observe(scrollContainer);

		// Also check after a small delay to catch any late-rendering content
		const timer = setTimeout(() => {
			checkScrollable();
		}, 100);

		return () => {
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			clearTimeout(timer);
		};
	});

	$effect(() => {
		if (!scrollContainer) return;

		const logCardLoad = () => {
			if (DEBUG) {
				console.log('QuizCard loaded', {
					questionId: currentQuestion?.question_id,
					isScrollable: isScrollable.value
				});
			}
		};

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLDivElement;
			const isAtTop = scrollTop === 0;
			const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

			if (isAtTop) {
				scrollState.value = 'top';
				edgeState.topLogged = true;
			} else if (isAtBottom) {
				scrollState.value = 'bottom';
				edgeState.bottomLogged = true;
			} else {
				scrollState.value = 'middle';
				edgeState.topLogged = false;
				edgeState.bottomLogged = false;
			}
		};

		// Only set up scroll listener if container is scrollable
		if (isScrollable.value) {
			(scrollContainer as HTMLDivElement).addEventListener('scroll', handleScroll);
		}

		// Log for all cards
		setTimeout(logCardLoad, 100);

		return () => {
			const container = scrollContainer as HTMLDivElement;
			container.removeEventListener('scroll', handleScroll);
		};
	});

	let touchStartY = 0;
	let touchEndY = 0;
	let touchStartTime = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
		touchStartTime = Date.now();
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndY = e.changedTouches[0].clientY;
		const deltaY = touchEndY - touchStartY;
		const deltaTime = Date.now() - touchStartTime;

		// Only trigger swipe if it's a significant vertical swipe (< 300ms and > 40px)
		if (Math.abs(deltaY) > 40 && deltaTime < 300) {
			if (deltaY < 0) {
				goToNextCard();
			} else {
				goToPreviousCard();
			}
		}
	}

	// Check if current question is multiple choice
	let isMultipleChoice = $derived(currentQuestion?.question_type === 'multiple_answer_question');

	// Track which answer buttons should animate
	let popIndex = $state<number | null>(null);
	let shakeIndex = $state<number | null>(null);

	// Watch for selectedAnswers changes to trigger pop animation (only on add, never on remove)
	let prevSelectedLen = 0;
	$effect(() => {
		const sa = selectedAnswers;
		if (sa.length > prevSelectedLen && !questionLocked) {
			popIndex = sa[sa.length - 1];
			const timer = setTimeout(() => { popIndex = null; }, 300);
			return () => clearTimeout(timer);
		}
		prevSelectedLen = sa.length;
	});

	// Watch for questionLocked to trigger shake on wrong answers
	$effect(() => {
		if (questionLocked) {
			// Find which selected answer is wrong
			const wrongIdx = selectedAnswers.find((idx: number) => {
				const originalIdx = originalIndices?.[idx] ?? idx;
				return !currentQuestion?.answers?.[originalIdx]?.is_correct;
			});
			if (wrongIdx !== undefined) {
				shakeIndex = wrongIdx;
				const timer = setTimeout(() => { shakeIndex = null; }, 500);
				return () => clearTimeout(timer);
			}
		}
	});

	// Reset local animation state when the question changes
	$effect(() => {
		const _ = currentQuestion?.question_id;
		popIndex = null;
		shakeIndex = null;
	});

	// Helper function for answer styling with enhanced feedback
	function getAnswerClass(idx: number): string {
		const isSelected = selectedAnswers.includes(idx);
		const originalIdx = originalIndices?.[idx] ?? idx;
		const isCorrect = currentQuestion?.answers?.[originalIdx]?.is_correct;

		let classes = '';

		if (questionLocked) {
			// After checking: show correct/incorrect/missed states
			if (isCorrect && isSelected) {
				classes += ' border-[var(--color-success)] bg-[var(--color-success)]/10 answer-correct-glow';
			} else if (isCorrect && !isSelected) {
				classes += ' border-[var(--color-accent)] border-dashed bg-[var(--color-accent)]/5';
			} else if (!isCorrect && isSelected) {
				classes += ' border-[var(--color-error)] bg-[var(--color-error)]/10';
			}
		} else if (isSelected) {
			// Before checking: just show selection
			classes += ' border-[var(--color-primary)] bg-[var(--color-primary)]/10';
		}

		// Pop animation
		if (popIndex === idx) {
			classes += ' answer-pop';
		}

		// Shake animation (wrong answer)
		if (shakeIndex === idx) {
			classes += ' answer-shake';
		}

		return classes;
	}

	// Get the result icon for an answer
	function getAnswerResultIcon(idx: number): 'correct' | 'incorrect' | 'missed' | null {
		if (!questionLocked) return null;

		const isSelected = selectedAnswers.includes(idx);
		const originalIdx = originalIndices?.[idx] ?? idx;
		const isCorrect = currentQuestion?.answers?.[originalIdx]?.is_correct;

		if (isCorrect && isSelected) return 'correct';
		if (isCorrect && !isSelected) return 'missed';
		if (!isCorrect && isSelected) return 'incorrect';
		return null;
	}
</script>

<!-- Quiz Card -->
<div
	class="w-full h-full flex flex-col overflow-hidden"
	style="transform: translateY(0px); transition: none;"
	onmousedown={() => {
		isHeld = true;
		if (DEBUG) {
			console.log('isHeld set to true (mousedown)');
		}
	}}
	onmouseup={() => {
		isHeld = false;
		if (DEBUG) {
			console.log('isHeld set to false (mouseup)');
		}
	}}
	onmouseleave={() => {
		isHeld = false;
		if (DEBUG) {
			console.log('isHeld set to false (mouseleave)');
		}
	}}
	ontouchstart={(e) => {
		isHeld = true;
		if (DEBUG) {
			console.log('isHeld set to true (touchstart)');
		}
		if (!isScrollable.value) handleTouchStart(e);
	}}
	ontouchend={(e) => {
		isHeld = false;
		if (DEBUG) {
			console.log('isHeld set to false (touchend)');
		}
		if (!isScrollable.value) handleTouchEnd(e);
	}}
	role="button"
	tabindex="0"
>
	<!-- Content wrapper with max-width for readability -->
	<div
		bind:this={scrollContainer}
		class="max-w-4xl mx-auto w-full px-4 py-6 md:px-12 md:py-12 flex-1 flex flex-col overflow-y-auto main-scrollbar text-[var(--text-primary)]"
		onwheel={(e) => {
			// Block scroll wheel navigation when card is scrollable
			// Navigation will be handled by explicit buttons at edges
			if (isScrollable.value) {
				e.stopPropagation();
			}
		}}
	>
		<!-- Question number and Favorite Button row -->
		<div class="flex items-center justify-between mb-2">
			<span class="text-[var(--text-secondary)] text-base flex items-center gap-2 flex-wrap">
				{#if quizData.length}
					Question {current + 1} / {quizData.length}
					<!-- Question Type Badge -->
					{#if isMultipleChoice}
						<span
							class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] text-xs font-medium border border-[var(--color-secondary)]/40"
						>
							<SquareCheck size={12} />
							Multiple
						</span>
					{:else}
						<span
							class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--text-secondary)]/15 text-[var(--text-secondary)] text-xs font-medium border border-[var(--text-secondary)]/40"
						>
							<CircleDot size={12} />
							Single
						</span>
					{/if}
					{#if currentQuestion?.module}
						<span
							class="inline-block px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--color-primary)] text-xs font-medium border border-[var(--color-primary)]"
						>
							Module: {currentQuestion.module}
						</span>
					{/if}
					{#if currentQuestion?.question_id}
						<span
							class="hidden sm:inline-block px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--color-accent)] text-xs font-medium border border-[var(--color-accent)]"
						>
							ID: {currentQuestion.question_id}
						</span>
					{/if}
				{/if}
			</span>
			<div class="flex items-center gap-2">
				<!-- Streak Badge -->
				{#if quizSession.streak > 0}
					<span
						class="streak-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
						class:streak-pop={quizSession.streak > 0}
						style="background: rgba(245, 166, 35, 0.15); border: 1px solid var(--color-accent); color: var(--color-accent);"
					>
						<span class="text-sm leading-none">🔥</span>
						{quizSession.streak}
					</span>
				{/if}
				<!-- This is the favorite button -->
				<button
					aria-label="Toggle favorite"
					class="cursor-pointer w-10 h-10 bg-transparent border-none p-0 flex items-center justify-center"
					onclick={() => toggleFavorite(current)}
				>
					{#if isFavorited(currentQuestion?.question_id ?? '')}
						<Star fill="var(--color-accent)" color="var(--color-accent)" size={32} />
					{:else}
						<Star color="var(--text-primary)" size={32} />
					{/if}
				</button>
			</div>
		</div>
		<!-- Question Image -->
		{#if currentQuestion?.image_url}
			<div class="question-image mb-4">
				<img
					src={currentQuestion.image_url}
					alt="Question illustration"
					class="w-full max-h-64 object-contain rounded-lg"
					loading="lazy"
				/>
			</div>
		{/if}
		<!-- Question Text -->
		<div class="question-row text-lg mb-4">
			{#if currentQuestion}
				<BilingualText
					en={currentQuestion.question_text_en || currentQuestion.question_text || currentQuestion.question || ''}
					vi={currentQuestion.question_text_vi || currentQuestion.question_text || currentQuestion.question || ''}
					variant="question"
				/>
			{:else}
				{quizData.length === 0 ? 'Please select a module to begin.' : ''}
			{/if}
		</div>
		<!-- Answers List -->
		<div class="answers-row flex flex-col gap-3 mb-4">
			{#if currentQuestion}
				{#each answers as ans, idx (idx)}
					{@const resultIcon = getAnswerResultIcon(idx)}
					{@const isSelected = selectedAnswers.includes(idx)}
					{@const isResultLocked = questionLocked}
					<button
						type="button"
						class="answer-btn relative flex items-start gap-3 px-4 py-3 rounded-lg border-2 border-[var(--border)] bg-[var(--bg-hover)] text-base text-[var(--text-primary)] cursor-pointer transition-all duration-200 text-left break-words {getAnswerClass(
							idx
						)}"
						disabled={questionLocked}
						onclick={() => {
							if (DEBUG) {
								console.log('[QuizCard] Answer button clicked', {
									idx,
									questionLocked,
									selectedAnswers,
									questionType: currentQuestion.question_type
								});
							}
							handleAnswerClick(idx, currentQuestion.question_type ?? 'single');
						}}
						aria-pressed={selectedAnswers.includes(idx)}
						aria-label={'Answer ' + (idx + 1)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								if (DEBUG) {
									console.log('[QuizCard] Answer button keydown', {
										idx,
										questionLocked,
										selectedAnswers,
										questionType: currentQuestion.question_type
									});
								}
								handleAnswerClick(idx, currentQuestion.question_type ?? 'single');
							}
						}}
					>
						<!-- Selection Indicator (Radio/Checkbox) -->
						<span class="flex-shrink-0 mt-0.5 indicator-icon" class:indicator-pop={isSelected && !questionLocked}>
							{#if isMultipleChoice}
								{#if isSelected}
									<SquareCheck size={20} class="text-[var(--color-primary)]" />
								{:else}
									<Square size={20} class="text-[var(--text-secondary)]" />
								{/if}
							{:else if isSelected}
								<CircleDot size={20} class="text-[var(--color-primary)]" />
							{:else}
								<Circle size={20} class="text-[var(--text-secondary)]" />
							{/if}
						</span>

						<!-- Answer Text -->
						<span class="flex-1">
							<BilingualText en={ans.answer_text_en || ans.answer_text || ''} vi={ans.answer_text_vi || ans.answer_text || ''} variant="answer" />
						</span>

						<!-- Result Icon (after checking) -->
						{#if resultIcon}
							<span class="flex-shrink-0 mt-0.5">
								{#if resultIcon === 'correct'}
									<Check size={20} class="text-[var(--color-success)]" />
								{:else if resultIcon === 'incorrect'}
									<X size={20} class="text-[var(--color-error)]" />
								{:else if resultIcon === 'missed'}
									<span class="text-[var(--color-accent)] text-xs font-medium">Missed</span>
								{/if}
							</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>
		<!-- Check Button (MCQ only) -->
		{#if isMultipleChoice && !questionLocked}
			<div class="flex flex-col items-center w-full gap-2">
				<!-- Selection counter -->
				{#if selectedAnswers.length > 0}
					<span class="text-sm text-[var(--text-secondary)]">
						{selectedAnswers.length} answer{selectedAnswers.length !== 1 ? 's' : ''} selected
					</span>
				{:else}
					<span class="text-sm text-[var(--text-secondary)] opacity-70">
						Select one or more answers
					</span>
				{/if}
				<button
					id="check-btn"
					class="mt-1 mb-4 px-8 py-3 rounded-lg font-semibold text-base transition-all duration-200
					{selectedAnswers.length > 0
						? 'bg-[var(--color-primary)] text-[var(--bg-primary)] shadow-lg shadow-[var(--color-primary)]/25 hover:shadow-[var(--color-primary)]/40 hover:scale-[1.02] active:scale-[0.98]'
						: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-not-allowed opacity-50'}"
					onclick={checkAnswers}
					disabled={selectedAnswers.length === 0}
				>
					Check Answers
				</button>
			</div>
		{/if}

		<!-- Subtle ID footer (mobile only) -->
		{#if currentQuestion?.question_id}
			<div
				class="md:hidden mt-2 mb-4 text-center font-mono text-[10px] text-[var(--text-secondary)] opacity-60"
			>
				ID: {currentQuestion.question_id}
			</div>
		{/if}
	</div>
</div>

{#if isScrollable.value}
	<!-- Mobile: right-docked circular nav buttons (no content overlap) -->
	<div class="md:hidden fixed right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
		<button
			type="button"
			class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border-2 border-[var(--color-primary)] shadow-lg transition-opacity duration-200
					{scrollState.value === 'top' && !isHeld ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
			aria-label="Go to previous card"
			onclick={goToPreviousCard}
		>
			<ArrowUp class="w-5 h-5 text-[var(--color-primary)]" />
		</button>
		<button
			type="button"
			class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border-2 border-[var(--color-primary)] shadow-lg transition-opacity duration-200
					{scrollState.value === 'bottom' && isScrollable.value && current < quizData.length - 1 && !isHeld
				? 'opacity-100'
				: 'opacity-0 pointer-events-none'}"
			aria-label="Go to next card"
			onclick={goToNextCard}
		>
			<ArrowDown class="w-5 h-5 text-[var(--color-primary)]" />
		</button>
	</div>

	<!-- Desktop: Text-based navigation buttons above FAB area -->
	{#if scrollState.value === 'top' && current > 0}
		<button
			type="button"
			class="hidden md:flex fixed bottom-24 right-6 z-10 items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] border border-[var(--color-primary)] shadow-xl text-[var(--bg-primary)] font-medium text-base hover:opacity-90 transition-all duration-200 cursor-pointer"
			aria-label="Go to previous question"
			onclick={goToPreviousCard}
		>
			<ChevronLeft size={20} />
			<span>Previous Question</span>
		</button>
	{/if}
	{#if scrollState.value === 'bottom' && current < quizData.length - 1}
		<button
			type="button"
			class="hidden md:flex fixed bottom-24 right-6 z-10 items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] border border-[var(--color-primary)] shadow-xl text-[var(--bg-primary)] font-medium text-base hover:opacity-90 transition-all duration-200 cursor-pointer"
			aria-label="Go to next question"
			onclick={goToNextCard}
		>
			<span>Next Question</span>
			<ChevronRight size={20} />
		</button>
	{/if}
{/if}

<style>
	/* Answer pop on click */
	.answer-pop {
		animation: popAnim 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes popAnim {
		0% { transform: scale(1); }
		50% { transform: scale(1.025); }
		100% { transform: scale(1); }
	}

	/* Shake on wrong answer */
	.answer-shake {
		animation: shakeAnim 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}

	@keyframes shakeAnim {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-6px); }
		40% { transform: translateX(6px); }
		60% { transform: translateX(-4px); }
		80% { transform: translateX(4px); }
	}

	/* Correct answer glow pulse */
	.answer-correct-glow {
		animation: glowPulse 1.5s ease-in-out 0.3s;
	}

	@keyframes glowPulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
		50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3); }
	}

	/* Indicator icon pop */
	.indicator-icon {
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.indicator-pop {
		transform: scale(1.15);
	}

	/* Streak badge pop */
	.streak-badge {
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.streak-pop {
		animation: streakPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes streakPop {
		0% { transform: scale(1); }
		50% { transform: scale(1.25); }
		100% { transform: scale(1); }
	}
</style>
