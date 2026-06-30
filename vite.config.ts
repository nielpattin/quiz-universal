import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	clearScreen: false,
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		host: true,
		port: 30000,
		warmup: {
			clientFiles: ['./src/app.html', './src/routes/+page.svelte']
		},
		watch: {
			// Exclude non-source asset folders from the file watcher.
			// references/ holds pptx + exported slide PNGs that get locked
			// during conversion, which crashes Vite's watcher (EBUSY).
			ignored: ['**/references/**', '**/.git/**', '**/slides/**']
		}
	},
	preview: {
		port: 30000
	}
});
