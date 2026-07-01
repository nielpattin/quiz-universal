<script lang="ts">
	import { DEBUG } from '$lib/config';
	import QuizCard from './QuizCard.svelte';
	import {
		pageState,
		favorites,
		appState,
		quizSession,
		trackResult,
		resetQuizSession,
		clearQuiz,
		timerEnabled,
		soundEnabled,
		saveHighScore,
		trackWrongQuestion
	} from './global.svelte';
	import confetti from 'canvas-confetti';
	import { fly, scale } from 'svelte/transition';
	import { playSelect, playCorrect, playWrong, playComplete } from '$lib/sounds';

	interface CurrentQuestion {
		question_id?: string;
		question_text?: string;
		answers?: Array<{ is_correct: boolean }>;
		question_type: string;
		image_url?: string | null;
	}

	function getCurrentQuestionWithType(q: Record<string, unknown>): CurrentQuestion {
		return {
			question_id: typeof q.question_id === 'string' ? q.question_id : '',
			question_text: typeof q.question_text === 'string' ? q.question_text : '',
			answers: Array.isArray(q.answers) ? (q.answers as Array<{ is_correct: boolean }>) : [],
			question_type: typeof q.question_type === 'string' ? (q.question_type as string) : 'single',
			image_url: typeof q.image_url === 'string' ? q.image_url : null
		};
	}
	function shuffleArray<T>(array: T[]): T[] {
		const arr = array.slice();
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	/* Store shuffled answers and mapping for each question index */
	let shuffledAnswers = $state<{ [idx: number]: { answer_text: string }[] }>({});
	let shuffledIndices = $state<{ [idx: number]: number[] }>({});

	function getAnswers(idx: number): { answer_text: string }[] {
		return shuffledAnswers[idx] ?? [];
	}

	function getOriginalIndex(idx: number, shuffledIdx: number): number {
		return shuffledIndices[idx]?.[shuffledIdx] ?? shuffledIdx;
	}

	$effect(() => {
		const idx = pageState.current;
		const answers = Array.isArray(pageState.quizData[idx]?.answers)
			? pageState.quizData[idx].answers.map((a: string | { answer_text: string }) =>
					typeof a === 'object' && a !== null ? a : { answer_text: String(a) }
				)
			: [];
		const indices = answers.map((_, i) => i);
		const shuffled = shuffleArray(indices);
		shuffledAnswers[idx] = shuffled.map((i) => answers[i]);
		shuffledIndices[idx] = shuffled;
	});

	// ===== Timer =====
	const TIMER_SECONDS = 25;
	// Plain let (not $state) to prevent effect re-run loop
	let timerRunning = false;
	// Whether current question is locked (for timer pause)
	let isCurrentLocked = $derived(
		pageState.quizData[pageState.current]
			? pageState.questionLockedStatus.get(pageState.quizData[pageState.current].question_id ?? '') ?? false
			: false
	);

	let timerTimeoutId: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const q = pageState.quizData[pageState.current];
		const isAnswered = q ? (pageState.questionLockedStatus.get(q.question_id ?? '') ?? false) : false;
		const shouldRun = timerEnabled.value && !isAnswered && pageState.quizData.length > 0 && q;
		if (shouldRun && !timerRunning) {
			timerRunning = true;
			timerTimeoutId = setTimeout(() => {
				timerRunning = false;
				timerTimeoutId = null;
				const qid = pageState.quizData[pageState.current]?.question_id;
				if (qid && !(pageState.questionLockedStatus.get(qid) ?? false)) {
					pageState.questionLockedStatus.set(qid, true);
					trackResult(qid, false);
					trackWrongQuestion(pageState.moduleId, qid);
					pageState.questionAnswers.set(qid, []);
					if (soundEnabled.value) playWrong();
				}
			}, TIMER_SECONDS * 1000);
		} else if (!shouldRun && timerRunning) {
			if (timerTimeoutId) {
				clearTimeout(timerTimeoutId);
				timerTimeoutId = null;
			}
			timerRunning = false;
		}
		return () => { if (timerTimeoutId) { clearTimeout(timerTimeoutId); timerTimeoutId = null; } timerRunning = false; };
	});

	function handleToggleFavorite(idx: number) {
		if (!pageState.quizData[idx]) return;
		const qid = pageState.quizData[idx].question_id;
		if (favorites.has(qid)) {
			favorites.delete(qid);
			// If in favorites view, remove the question from quizData and update current index
			if (appState.currentView === 'favorites') {
				pageState.quizData = pageState.quizData.filter((q) => favorites.has(q.question_id));
				// Clamp current index to valid range
				pageState.current = Math.max(0, Math.min(pageState.current, pageState.quizData.length - 1));
			}
		} else {
			favorites.add(qid);
		}
	}

	function handleAnswerClick(idx: number, questionType: string) {
		if (DEBUG) {
			console.log('[handleAnswerClick] called', {
				idx,
				questionType,
				questionLocked: pageState.questionLocked,
				currentQuestionId: pageState.quizData[pageState.current]?.question_id,
				lockedStatus: pageState.questionLockedStatus.get(
					pageState.quizData[pageState.current]?.question_id
				)
			});
		}
		if (pageState.questionLocked) {
			if (DEBUG) console.log('[handleAnswerClick] blocked: pageState.questionLocked');
			return;
		}
		const currentQuestionId = pageState.quizData[pageState.current]?.question_id;
		if (!currentQuestionId) {
			if (DEBUG) console.log('[handleAnswerClick] blocked: no currentQuestionId');
			return;
		}

		// For single-answer questions, return early if the question is already locked
		if (questionType === 'single' && pageState.questionLockedStatus.get(currentQuestionId)) {
			if (DEBUG) console.log('[handleAnswerClick] blocked: already locked for single');
			return;
		}

		const currentAnswers = pageState.questionAnswers.get(currentQuestionId) || [];
		let newAnswers: number[];
		if (questionType === 'multiple_answer_question') {
			if (currentAnswers.includes(idx)) {
				newAnswers = currentAnswers.filter((i) => i !== idx);
			} else {
				newAnswers = [...currentAnswers, idx];
			}
		} else {
			newAnswers = [idx];
		}
		// Set answers BEFORE checkAnswers so correctness can read them
		pageState.questionAnswers.set(currentQuestionId, newAnswers);
		if (DEBUG) console.log('[handleAnswerClick] updated answers', newAnswers);

		if (soundEnabled.value) playSelect();

		if (questionType !== 'multiple_answer_question') {
			if (DEBUG) console.log('[handleAnswerClick] single-answer: locking after selection');
			checkAnswers();
		}
	}

	function checkAnswers() {
		const currentQuestionId = pageState.quizData[pageState.current]?.question_id;
		if (!currentQuestionId) return;

		pageState.questionLockedStatus.set(currentQuestionId, true);

		// Track correctness
		const q = pageState.quizData[pageState.current];
		if (q && Array.isArray(q.answers)) {
			const selectedShuffled = pageState.questionAnswers.get(currentQuestionId) ?? [];
			const selectedOrig = selectedShuffled.map((si: number) => getOriginalIndex(pageState.current, si));
			const correctOrig = (q.answers as Array<{ is_correct?: boolean }>)
				.map((a, i) => (a.is_correct ? i : -1))
				.filter((i: number) => i >= 0);
			const isCorrect =
				selectedOrig.length === correctOrig.length &&
				correctOrig.every((i: number) => selectedOrig.includes(i));
			trackResult(currentQuestionId, isCorrect);
			if (isCorrect && soundEnabled.value) playCorrect();
			else if (!isCorrect && soundEnabled.value) playWrong();
			if (!isCorrect) trackWrongQuestion(pageState.moduleId, currentQuestionId);
		}
	}

	function goToPreviousCard() {
		if (pageState.current > 0) {
			// Reset all question states when navigating to a new card
			pageState.questionAnswers.clear();
			pageState.questionLockedStatus.clear();
			pageState.current -= 1;
		}
	}

	function goToNextCard() {
		if (pageState.current < pageState.quizData.length - 1) {
			// Reset all question states when navigating to a new card
			pageState.questionAnswers.clear();
			pageState.questionLockedStatus.clear();
			pageState.current += 1;
		}
	}

	function backToLibrary() {
		clearQuiz();
		appState.currentView = 'all';
	}

	let completionDismissed = $state(false);
	function dismissCompletion() {
		completionDismissed = true;
	}

	// Derived: quiz is complete when last question is answered
	let isComplete = $derived(
		pageState.quizData.length > 0 &&
			pageState.current === pageState.quizData.length - 1 &&
			pageState.questionLockedStatus.get(
				pageState.quizData[pageState.current]?.question_id ?? ''
			) === true
	);

	// Fire confetti when quiz completes
	let celebrated = false;
	$effect(() => {
		if (isComplete && !celebrated) {
			celebrated = true;
			saveHighScore(pageState.moduleId, quizSession.correct, quizSession.wrong);
			confetti({
				particleCount: 150,
				spread: 80,
				origin: { y: 0.6 },
				colors: [
					getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() ||
						'#e07b54',
					getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim() ||
						'#00d9c0',
					getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
						'#f5a623',
					getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() ||
						'#10b981'
				]
			});
		}
	});

	// Reset celebrated flag when quiz data changes (new quiz loaded)
	$effect(() => {
		if (pageState.quizData.length === 0) {
			celebrated = false;
			completionDismissed = false;
		}
	});
</script>

<!-- Carousel Component -->
{#if pageState.quizData.length > 0}
	<div class="carousel-vertical flex flex-col w-full h-full relative overflow-hidden">
		<!-- Progress Bar -->
		<div class="flex-shrink-0 w-full px-4 md:px-8 pt-2.5 pb-0 z-20">
			<div class="flex items-center gap-2.5">
				<div class="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-500 ease-out"
						style="width: {((pageState.current + 1) / pageState.quizData.length) * 100}%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));"
					></div>
				</div>
				<span class="text-xs text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
					{pageState.current + 1} / {pageState.quizData.length}
				</span>
			</div>
		</div>
		
		<!-- Timer Bar -->
		{#if timerEnabled.value && pageState.quizData.length > 0}
			<div class="flex-shrink-0 w-full px-4 md:px-8 pt-2 z-20">
				<div class="flex items-center gap-2">
				{#key pageState.current}
					<div class="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
						<div class="h-full rounded-full timer-bar" class:timer-paused={isCurrentLocked}></div>
					</div>
				{/key}
					<span class="text-xs text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
						{TIMER_SECONDS}s
					</span>
				</div>
			</div>
		{/if}
		<!-- Card area -->
		<div class="flex-1 relative overflow-hidden">
		{#each [pageState.current - 1, pageState.current, pageState.current + 1] as idx (idx)}
			{#if idx >= 0 && idx < pageState.quizData.length}
				<div
					class="carousel-card absolute inset-0"
					class:card-dim={idx !== pageState.current}
					style="transform: translateY({(idx - pageState.current) * 100}%); transition: all 0.35s cubic-bezier(0.4,0,0.2,1);"
				>
					<QuizCard
						currentQuestion={getCurrentQuestionWithType(pageState.quizData[idx])}
						current={idx}
						quizData={pageState.quizData}
						selectedAnswers={pageState.questionAnswers.get(pageState.quizData[idx]?.question_id) ?? []}
						questionLocked={pageState.questionLockedStatus.get(
							pageState.quizData[idx]?.question_id
						) ?? false}
						{checkAnswers}
						{handleAnswerClick}
						{favorites}
						toggleFavorite={(idx: number) => handleToggleFavorite(idx)}
						answers={getAnswers(idx)}
						originalIndices={shuffledIndices[idx]}
						{goToPreviousCard}
						{goToNextCard}
					/>
				</div>
			{/if}
		{/each}
		</div>
		<!-- Completion Overlay -->
		{#if isComplete && !completionDismissed}
			<div
				class="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
				transition:scale={{ start: 0.9, duration: 400 }}
			>
				<div
					class="bg-[var(--bg-surface)] rounded-2xl p-8 max-w-sm mx-4 shadow-2xl border border-[var(--border)] text-center"
					transition:fly={{ y: 30, duration: 350, delay: 100 }}
				>
					<div class="text-4xl mb-3">🎉</div>
					<h2 class="text-xl font-bold text-[var(--text-primary)] mb-3">Quiz Complete!</h2>
					<div class="space-y-1.5 mb-6">
						<p class="text-[var(--text-secondary)] text-sm">
							<span class="text-[var(--color-success)] font-semibold text-base"
								>{quizSession.correct}</span
							>
							correct
							<span class="mx-1.5">·</span>
							<span class="text-[var(--color-error)] font-semibold text-base"
								>{quizSession.wrong}</span
							>
							wrong
						</p>
						{#if quizSession.maxStreak > 1}
							<p class="text-[var(--text-secondary)] text-sm">
								Best streak:
								<span class="text-[var(--color-accent)] font-semibold"
									>{quizSession.maxStreak}</span
								>
								🔥
							</p>
						{/if}
						<p class="text-[var(--text-secondary)] text-xs mt-2">
							{((quizSession.correct / Math.max(quizSession.correct + quizSession.wrong, 1)) * 100).toFixed(0)}%
							accuracy
						</p>
					</div>
					<div class="flex gap-3">
						<button
							class="px-5 py-2.5 rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold hover:bg-[var(--border)] transition-all duration-200 cursor-pointer border border-[var(--border)]"
							onclick={dismissCompletion}
						>
							Review
						</button>
						<button
							class="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--bg-primary)] font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer"
							onclick={backToLibrary}
						>
							Back to Library
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="w-full h-full flex flex-col items-center justify-center">
		<div class="text-lg text-[var(--text-primary)] font-medium tracking-wide">
			No favorite questions
		</div>
	</div>
{/if}
<style>
	.card-dim {
		opacity: 0.75;
		scale: 0.96;
	}


	.timer-bar {
		animation: timer-countdown 25s linear forwards;
		background: var(--color-secondary);
	}

	.timer-paused {
		animation-play-state: paused;
	}
	@keyframes timer-countdown {
		0% { width: 100%; background: var(--color-secondary); }
		50% { background: var(--color-accent); }
		85% { background: var(--color-error); }
		100% { width: 0%; background: var(--color-error); }
	}
</style>