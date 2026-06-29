<script lang="ts">
	import { uiState } from './global.svelte';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Hand from '@lucide/svelte/icons/hand';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			uiState.showShortcutsModal = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			uiState.showShortcutsModal = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if uiState.showShortcutsModal}
	<div
		class="fixed inset-0 z-[1001] bg-black/50 backdrop-opacity-60 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
	>
		<div
			class="bg-[var(--bg-surface)] p-5 md:p-6 rounded-xl w-full max-w-md shadow-xl border border-[var(--border)] text-[var(--text-primary)] max-h-[85vh] overflow-y-auto"
		>
			<div class="flex items-center gap-2 mb-4">
				<CircleHelp size={22} class="text-[var(--color-primary)]" />
				<h3 id="shortcuts-title" class="text-[var(--color-primary)] text-lg font-semibold">
					Tips & Shortcuts
				</h3>
			</div>

			<!-- Mobile Touch Gestures Section -->
			<div class="mb-5">
				<div class="flex items-center gap-2 mb-3">
					<Hand size={18} class="text-[var(--color-accent)]" />
					<h4 class="text-[var(--color-accent)] font-medium text-sm">Touch Gestures</h4>
				</div>
				<table class="w-full text-left text-sm">
					<tbody>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Next question</td>
							<td class="py-2 text-right">
								<span class="gesture">Swipe up</span>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Previous question</td>
							<td class="py-2 text-right">
								<span class="gesture">Swipe down</span>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Hide nav arrows</td>
							<td class="py-2 text-right">
								<span class="gesture">Hold card</span>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Scroll card content</td>
							<td class="py-2 text-right">
								<span class="gesture">Swipe inside</span>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Select answer</td>
							<td class="py-2 text-right">
								<span class="gesture">Tap option</span>
							</td>
						</tr>
						<tr>
							<td class="py-2 text-[var(--text-secondary)]">Toggle favorite</td>
							<td class="py-2 text-right">
								<span class="gesture">Tap star</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Desktop Keyboard Shortcuts Section -->
			<div class="hidden md:block">
				<div class="flex items-center gap-2 mb-3">
					<Keyboard size={18} class="text-[var(--color-secondary)]" />
					<h4 class="text-[var(--color-secondary)] font-medium text-sm">Desktop Navigation</h4>
				</div>
				<table class="w-full text-left text-sm">
					<tbody>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Next question</td>
							<td class="py-2 text-right">
								<kbd>→</kbd>
								<kbd>D</kbd>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Previous question</td>
							<td class="py-2 text-right">
								<kbd>←</kbd>
								<kbd>A</kbd>
							</td>
						</tr>
						<tr class="border-b border-[var(--border)]">
							<td class="py-2 text-[var(--text-secondary)]">Scrollable cards</td>
							<td class="py-2 text-right">
								<span class="gesture">Scroll to edge → Click button</span>
							</td>
						</tr>
						<tr>
							<td class="py-2 text-[var(--text-secondary)]">Non-scrollable cards</td>
							<td class="py-2 text-right">
								<span class="gesture">Scroll wheel navigates</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<button
				class="mt-4 w-full text-base py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
				onclick={() => (uiState.showShortcutsModal = false)}
			>
				Close
			</button>
		</div>
	</div>
{/if}

<style>
	kbd {
		display: inline-block;
		padding: 0.15rem 0.4rem;
		font-size: 0.85em;
		font-family: monospace;
		background: var(--bg-hover);
		border: 1px solid var(--border);
		border-radius: 4px;
		margin-left: 0.25rem;
	}

	.gesture {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		font-size: 0.85em;
		background: var(--bg-hover);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-primary);
	}
</style>
