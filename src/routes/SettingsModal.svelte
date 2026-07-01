<script lang="ts">
	import {
		uiState,
		enStyleState,
		setEnSize,
		setEnOpacity,
		styleState,
		setStyle,
		setFont,
		timerEnabled,
		soundEnabled,
		focusMode,
		hapticEnabled,
		setTimerEnabled,
		setSoundEnabled,
		setFocusMode,
		setHapticEnabled,
		highScores
	} from './global.svelte';
	import Settings from '@lucide/svelte/icons/settings';
	import Languages from '@lucide/svelte/icons/languages';
	import Palette from '@lucide/svelte/icons/palette';
	import Type from '@lucide/svelte/icons/type';
	import Timer from '@lucide/svelte/icons/timer';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Focus from '@lucide/svelte/icons/scan';
	import Hand from '@lucide/svelte/icons/hand';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { STYLES, FONTS, type StyleKey, type FontId } from '$lib/theme';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			uiState.showSettingsModal = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			uiState.showSettingsModal = false;
		}
	}

	function handleSizeChange(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		setEnSize(val);
	}

	function handleOpacityChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		setEnOpacity(val);
	}

	function handleStyleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setStyle(target.value as StyleKey);
	}

	function handleFontChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setFont(target.value as FontId);
	}

	// Collect unique modules with scores
	let scoreEntries = $derived(
		Object.entries(highScores).sort((a, b) => b[1].accuracy - a[1].accuracy)
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if uiState.showSettingsModal}
	<div
		class="fixed inset-0 z-[1001] bg-black/50 backdrop-opacity-60 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="settings-title"
	>
		<div
			class="bg-[var(--bg-surface)] p-5 md:p-6 rounded-xl w-full max-w-sm shadow-xl border border-[var(--border)] text-[var(--text-primary)] max-h-[85vh] overflow-y-auto"
		>
			<div class="flex items-center gap-2 mb-6">
				<Settings size={22} class="text-[var(--color-primary)]" />
				<h3 id="settings-title" class="text-[var(--color-primary)] text-lg font-semibold">
					Settings
				</h3>
			</div>

			<div class="space-y-6">
				<!-- App Appearance -->
				<div class="space-y-4">
					<div class="flex items-center gap-2 mb-1">
						<Palette size={18} class="text-[var(--color-accent)]" />
						<h4 class="text-[var(--color-accent)] font-medium text-sm">Appearance</h4>
					</div>

					<!-- Theme Select -->
					<div class="space-y-2">
						<span class="flex justify-between text-xs text-[var(--text-secondary)]"> Theme </span>
						<select
							class="w-full px-3 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-sm cursor-pointer"
							value={styleState.style}
							onchange={handleStyleChange}
							aria-label="Select theme"
						>
							{#each Object.entries(STYLES) as [key, style] (key)}
								<option value={key}>{style.name}</option>
							{/each}
						</select>
					</div>

					<!-- Font Select -->
					<div class="space-y-2">
						<span class="flex justify-between text-xs text-[var(--text-secondary)]"> Font </span>
						<select
							class="w-full px-3 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-sm cursor-pointer"
							value={styleState.font}
							onchange={handleFontChange}
							aria-label="Select font"
						>
							{#each FONTS as font (font.id)}
								<option value={font.id}>{font.name}</option>
							{/each}
						</select>
					</div>

					<!-- Focus Mode -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Focus size={16} class="text-[var(--color-accent)]" />
							<span class="text-sm text-[var(--text-primary)]">Focus Mode</span>
						</div>
						<p class="text-xs text-[var(--text-secondary)] mr-2">Hides sidebar, centers card</p>
						<button
							class="relative w-10 h-5 rounded-full transition-colors duration-200 {focusMode.value ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-hover)]'} border border-[var(--border)]"
							onclick={() => setFocusMode(!focusMode.value)}
							role="switch"
							aria-checked={focusMode.value}
							aria-label="Toggle focus mode"
						>
							<span
								class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 {focusMode.value ? 'translate-x-5' : 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>

				<!-- Quiz Experience -->
				<div class="space-y-4">
					<div class="flex items-center gap-2 mb-1">
						<Timer size={18} class="text-[var(--color-secondary)]" />
						<h4 class="text-[var(--color-secondary)] font-medium text-sm">Quiz Experience</h4>
					</div>

					<!-- Timer Toggle -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Timer size={16} class="text-[var(--color-secondary)]" />
							<span class="text-sm text-[var(--text-primary)]">Question Timer</span>
						</div>
						<button
							class="relative w-10 h-5 rounded-full transition-colors duration-200 {timerEnabled.value ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-hover)]'} border border-[var(--border)]"
							onclick={() => setTimerEnabled(!timerEnabled.value)}
							role="switch"
							aria-checked={timerEnabled.value}
							aria-label="Toggle question timer"
						>
							<span
								class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 {timerEnabled.value ? 'translate-x-5' : 'translate-x-0'}"
							></span>
						</button>
					</div>

					<!-- Sound Toggle -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Volume2 size={16} class="text-[var(--color-secondary)]" />
							<span class="text-sm text-[var(--text-primary)]">Sound Effects</span>
						</div>
						<button
							class="relative w-10 h-5 rounded-full transition-colors duration-200 {soundEnabled.value ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-hover)]'} border border-[var(--border)]"
							onclick={() => setSoundEnabled(!soundEnabled.value)}
							role="switch"
							aria-checked={soundEnabled.value}
							aria-label="Toggle sound effects"
						>
							<span
								class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 {soundEnabled.value ? 'translate-x-5' : 'translate-x-0'}"
							></span>
						</button>
					</div>

					<!-- Haptic Toggle (mobile) -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Hand size={16} class="text-[var(--color-secondary)]" />
							<span class="text-sm text-[var(--text-primary)]">Haptic Feedback</span>
						</div>
						<p class="text-xs text-[var(--text-secondary)] mr-2">Mobile vibration</p>
						<button
							class="relative w-10 h-5 rounded-full transition-colors duration-200 {hapticEnabled.value ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-hover)]'} border border-[var(--border)]"
							onclick={() => setHapticEnabled(!hapticEnabled.value)}
							role="switch"
							aria-checked={hapticEnabled.value}
							aria-label="Toggle haptic feedback"
						>
							<span
								class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 {hapticEnabled.value ? 'translate-x-5' : 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>

				<!-- English Text Settings -->
				<div class="space-y-4">
					<div class="flex items-center gap-2 mb-1">
						<Languages size={18} class="text-[var(--color-accent)]" />
						<h4 class="text-[var(--color-accent)] font-medium text-sm">English Text Styling</h4>
					</div>

					<!-- Size Slider -->
					<div class="space-y-2">
						<div class="flex justify-between text-xs text-[var(--text-secondary)]">
							<span>Font Size</span>
							<span>{enStyleState.size}px</span>
						</div>
						<input
							type="range"
							min="8"
							max="20"
							step="1"
							value={enStyleState.size}
							oninput={handleSizeChange}
							class="w-full accent-[var(--color-primary)]"
						/>
					</div>

					<!-- Opacity Slider -->
					<div class="space-y-2">
						<div class="flex justify-between text-xs text-[var(--text-secondary)]">
							<span>Opacity</span>
							<span>{Math.round(enStyleState.opacity * 100)}%</span>
						</div>
						<input
							type="range"
							min="0.1"
							max="1"
							step="0.05"
							value={enStyleState.opacity}
							oninput={handleOpacityChange}
							class="w-full accent-[var(--color-primary)]"
						/>
					</div>
				</div>

				<!-- Preview Box -->
				<div class="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] space-y-1">
					<span class="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1"
						>Preview</span
					>
					<div class="flex flex-col gap-0.5">
						<span style="font-size: {enStyleState.size}px; opacity: {enStyleState.opacity}"
							>Sample English Text</span
						>
						<span class="text-sm">Vn bn Ting Vit mu</span>
					</div>
				</div>

				<!-- High Scores -->
				{#if scoreEntries.length > 0}
					<div class="space-y-4">
						<div class="flex items-center gap-2 mb-1">
							<Trophy size={18} class="text-[var(--color-accent)]" />
							<h4 class="text-[var(--color-accent)] font-medium text-sm">Best Scores</h4>
						</div>
						<div class="space-y-1.5 max-h-40 overflow-y-auto">
							{#each scoreEntries as [moduleId, score]}
								<div
									class="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-[var(--bg-hover)] border border-[var(--border)]"
								>
									<span class="truncate max-w-[120px] text-[var(--text-primary)]">{moduleId}</span>
									<span class="text-[var(--color-success)]">{score.correct}/{score.correct + score.wrong}</span>
									<span class="text-[var(--text-secondary)]">{score.accuracy}%</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<button
				class="mt-6 w-full text-base py-2 rounded-lg bg-[var(--color-primary)] text-[var(--bg-primary)] font-bold hover:opacity-90 cursor-pointer transition-transform active:scale-[0.98]"
				onclick={() => (uiState.showSettingsModal = false)}
			>
				Done
			</button>
		</div>
	</div>
{/if}

<style>
	input[type='range'] {
		height: 6px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--bg-hover);
		border-radius: 3px;
		outline: none;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: var(--color-primary);
		cursor: pointer;
		border-radius: 50%;
		border: 2px solid var(--bg-surface);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}
</style>
