import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        svelte({
            // Opciones de Svelte aquí
            compilerOptions: {
                compatibility: {
                    componentApi: 4
                }
            }
        }),
    ],
});
