<script lang="ts">
	import { enStyleState } from '../../routes/global.svelte';

	interface Props {
		en?: string;
		vi?: string;
		variant?: 'question' | 'answer';
	}

	let { en = '', vi = '', variant = 'question' }: Props = $props();
</script>

{#if variant === 'question'}
	<!-- Question: English above, Vietnamese below -->
	<div class="flex flex-col gap-1">
		{#if en}
			<span style="font-size: {enStyleState.size}px; opacity: {enStyleState.opacity}">
				{en}
			</span>
		{/if}
		{#if vi}
			<span>{vi}</span>
		{/if}
	</div>
{:else}
	<!-- Answer: English above, Vietnamese below -->
	<div class="flex flex-col gap-0.5">
		{#if en}
			<span style="font-size: {enStyleState.size}px; opacity: {enStyleState.opacity}">
				{en}
			</span>
		{/if}
		{#if vi}
			<span>{vi}</span>
		{/if}
	</div>
{/if}
