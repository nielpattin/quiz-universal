<script lang="ts">
	import { uiState, getFavIdList, favorites } from './global.svelte';

	let copied = $state(false);

	function handleCopy() {
		navigator.clipboard.writeText(getFavIdList());
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

{#if uiState.showFavModal}
	<div
		class="fav-id-modal-backdrop fixed inset-0 z-[1001] bg-black/50 backdrop-opacity-60 flex items-center justify-center"
	>
		<div
			class="fav-id-modal bg-[var(--bg-surface)] p-6 rounded-xl min-w-[320px] max-w-[95vw] shadow-xl border border-[var(--border)] text-[var(--text-primary)]"
		>
			<h3 class="text-[var(--color-primary)] text-lg font-semibold mb-3">Favorite Questions</h3>
			<textarea
				id="fav-id-list"
				class="w-full h-32 resize-none text-base mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-primary)] p-2"
				readonly
				value={getFavIdList()}></textarea>
			<div class="fav-id-modal-btn-row flex gap-2 mb-2">
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--color-primary)] font-medium hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
					onclick={handleCopy}
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--color-secondary)] font-medium hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
					onclick={async () => {
						const text = await navigator.clipboard.readText();
						const newIds = text
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean);
						for (const id of newIds) favorites.add(id);
						uiState.showFavModal = false;
					}}>Paste & Import</button
				>
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium hover:bg-[var(--border)] cursor-pointer border border-[var(--border)]"
					onclick={() => (uiState.showFavModal = false)}>Close</button
				>
			</div>
			<small class="text-[var(--text-secondary)] text-sm"
				>Copy/paste to share favorites between devices.</small
			>
		</div>
	</div>
{/if}
