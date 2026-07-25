import { defineConfig } from 'tsup';

export default defineConfig({
	outDir: 'build',
	entry: ['src/**/*.ts'],
});
