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
		trackWrongQuestion,
		addSessionScore,
		totalPoints,
		scoredQuestions,
		lastPointsBreakdown
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


	// ===== Score =====
	let prevScore = 0;
	let showScoreDelta = $state(false);
	let scoreDeltaValue = $state(0);

	$effect(() => {
		const s = quizSession.score;
		if (s > prevScore) {
			scoreDeltaValue = s - prevScore;
			showScoreDelta = true;
			const id = setTimeout(() => { showScoreDelta = false; }, 1500);
			prevScore = s;
			return () => clearTimeout(id);
		}
	});
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
					// Guard: don't re-score if already answered
					if (!scoredQuestions.has(qid)) {
						trackResult(qid, false);
						trackWrongQuestion(pageState.moduleId, qid);
						if (soundEnabled.value) playWrong();
					}
					pageState.questionAnswers.set(qid, []);
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

		// Lock feedback even if already scored (replay review)
		pageState.questionLockedStatus.set(currentQuestionId, true);

		// Guard: don't award points twice for the same question
		if (scoredQuestions.has(currentQuestionId)) {
			if (soundEnabled.value) playCorrect();
			return;
		}

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
			scoredQuestions.add(currentQuestionId);

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
			addSessionScore();
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
		<!-- Progress Bar + Score + Streak -->
		<div class="flex-shrink-0 w-full px-4 md:px-8 pt-2.5 pb-0 z-20">
			<div class="flex items-center gap-2.5">
				<div class="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden relative">
					<div
						class="h-full rounded-full transition-all duration-500 ease-out progress-fill"
						style="width: {((pageState.current + 1) / pageState.quizData.length) * 100}%"
					></div>
					<div class="shimmer"></div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
						{pageState.current + 1} / {pageState.quizData.length}
					</span>
					<!-- Streak badge -->
					{#if quizSession.streak > 1}
					<div class="streak-badge flex items-center gap-0.5 px-2 py-0.5 rounded-full">
						<span class="fire-icon">🔥</span>
						<span class="streak-count">{quizSession.streak}</span>
						<span class="multiplier-pill">x2</span>
					</div>
					{/if}
					<!-- Score badge -->
					<div class="score-badge flex items-center gap-1 px-2.5 py-0.5 rounded-full relative">
						<span class="score-star">★</span>
						<span class="score-val">{quizSession.score}</span>
						<span class="score-unit">pts</span>
						{#if showScoreDelta}
							<span class="float-popup">+{scoreDeltaValue}</span>
						{/if}
					</div>
				</div>
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
						lastPointsBreakdown={lastPointsBreakdown}
					/>
				</div>
			{/if}
		{/each}
		</div>
		<!-- Combo bar -->
		<div class="combo-bar flex-shrink-0 flex items-center gap-3 px-4 md:px-8 py-2">
			<div class="combo-item flex items-center gap-1">
				<span class="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Score</span>
				<span class="text-sm font-bold text-[var(--color-accent)] tabular-nums">{quizSession.score}</span>
			</div>
			<div class="combo-divider"></div>
			<div class="combo-item flex items-center gap-1">
				<span class="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Correct</span>
				<span class="text-sm font-bold text-[var(--color-success)] tabular-nums">{quizSession.correct}</span>
			</div>
			<div class="combo-divider"></div>
			<div class="combo-item flex items-center gap-1">
				<span class="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Streak</span>
				<span class="text-sm font-bold text-[var(--color-fire)] tabular-nums">{quizSession.streak}</span>
			</div>
			<div class="combo-divider"></div>
			<div class="combo-item flex items-center gap-1">
				<span class="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Best</span>
				<span class="text-sm font-bold text-[var(--text-primary)] tabular-nums">{quizSession.maxStreak}</span>
			</div>
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
					<div class="text-2xl font-bold text-[var(--color-accent)] mb-4">
						★ {quizSession.score} <span class="text-xs font-normal text-[var(--text-secondary)]">points</span>
					</div>
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

	/* Progress bar fill gradient */
	.progress-fill {
		background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
	}

	/* Shimmer sweep */
	.shimmer {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 40%;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
		animation: shimmer-sweep 2.5s ease-in-out infinite;
	}

	@keyframes shimmer-sweep {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(350%); }
	}

	/* Streak badge */
	.streak-badge {
		background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(245,166,35,0.1));
		border: 1px solid rgba(255,107,53,0.3);
		animation: streak-pulse 1.2s ease-in-out infinite;
	}

	@keyframes streak-pulse {
		0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,107,53,0); }
		50% { transform: scale(1.04); box-shadow: 0 0 8px rgba(255,107,53,0.25); }
	}

	.fire-icon {
		display: inline-block;
		animation: fire-flicker 0.4s ease-in-out infinite alternate;
	}

	@keyframes fire-flicker {
		0% { transform: scale(1) rotate(0deg); }
		25% { transform: scale(1.08) rotate(-3deg); }
		50% { transform: scale(0.95) rotate(0deg); }
		75% { transform: scale(1.06) rotate(3deg); }
		100% { transform: scale(1.02) rotate(0deg); }
	}

	.streak-count {
		font-size: 13px;
		font-weight: 800;
		color: var(--color-fire, #ff6b35);
	}

	.multiplier-pill {
		font-size: 8px;
		font-weight: 700;
		color: var(--color-accent);
		background: var(--bg-surface);
		border: 1px solid var(--color-accent);
		padding: 0 3px;
		border-radius: 3px;
		line-height: 1.4;
		animation: multiplier-pop 0.5s ease-out;
	}

	@keyframes multiplier-pop {
		0% { transform: scale(0); opacity: 0; }
		60% { transform: scale(1.3); }
		100% { transform: scale(1); opacity: 1; }
	}

	/* Score badge */
	.score-badge {
		background: linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05));
		border: 1px solid rgba(245,166,35,0.25);
	}

	.score-star {
		display: inline-block;
		animation: star-spin 0.6s ease-out;
	}

	@keyframes star-spin {
		0% { transform: rotate(-180deg) scale(0); opacity: 0; }
		60% { transform: rotate(20deg) scale(1.15); }
		100% { transform: rotate(0deg) scale(1); opacity: 1; }
	}

	.score-val {
		font-size: 15px;
		font-weight: 800;
		color: var(--color-accent);
		letter-spacing: -0.5px;
		font-variant-numeric: tabular-nums;
	}

	.score-unit {
		font-size: 9px;
		font-weight: 500;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* Floating point popup */
	.float-popup {
		position: absolute;
		top: -10px;
		right: -2px;
		font-size: 10px;
		font-weight: 700;
		color: var(--color-success, #10b981);
		background: rgba(16,185,129,0.15);
		padding: 1px 5px;
		border-radius: 4px;
		pointer-events: none;
		animation: float-up 1.8s ease-out forwards;
	}

	@keyframes float-up {
		0% { opacity: 1; transform: translateY(0) scale(0.8); }
		20% { transform: translateY(-4px) scale(1.1); }
		50% { opacity: 1; transform: translateY(-14px) scale(1); }
		100% { opacity: 0; transform: translateY(-24px) scale(0.9); }
	}

	/* Combo bar */
	.combo-bar {
		background: var(--bg-surface);
		border-top: 1px solid var(--border);
	}

	.combo-divider {
		width: 1px;
		height: 16px;
		background: var(--border);
	}

	.combo-item {
		animation: combo-fade 0.4s ease-out backwards;
	}

	.combo-item:nth-child(1) { animation-delay: 0.05s; }
	.combo-item:nth-child(3) { animation-delay: 0.1s; }
	.combo-item:nth-child(5) { animation-delay: 0.15s; }
	.combo-item:nth-child(7) { animation-delay: 0.2s; }

	@keyframes combo-fade {
		0% { opacity: 0; transform: translateY(4px); }
		100% { opacity: 1; transform: translateY(0); }
	}

	/* Timer */
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