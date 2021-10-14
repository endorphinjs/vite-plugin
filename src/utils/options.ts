import path from 'path';
import type { ConfigEnv, UserConfig } from 'vite';
import type { Options, ResolvedOptions } from '../types';
import { safeBase64Hash } from './hash';

const defaultScriptType = 'text/javascript';
const defaultStyleType = 'text/css';

const knownOptions = new Set([
	'include',
	'exclude',
	'extensions',
	'astBase',
    'types',
    'template',
    'componentName',
    'entries',
    'css',
    'emitCss'
]);

function buildDefaultOptions(isProduction: boolean, options: Partial<Options>): Options {
	// emit for prod, emit in dev unless css hmr is disabled
	const emitCss = options?.emitCss != null ? options.emitCss : true;
	// no hmr in prod, only inject css in dev if emitCss is false
    const defaultOptions: Options = {
		extensions: ['.html', '.end'],
		emitCss,
        types: {
            [defaultScriptType]: '.js',
            [defaultStyleType]: '.css',
            'typescript': '.ts',
            'ts': '.ts',
            'javascript': '.js',
            'sass': '.sass',
            'scss': '.scss'
        },
        css: {
            scope(filePath: string): string {
                // A simple function for calculation of has (Adler32) from given string
                return 'e' + safeBase64Hash(filePath);
            }
        }
	};
	return defaultOptions;
}

export function validateInlineOptions(inlineOptions?: Partial<Options>) {
	const invalidKeys = Object.keys(inlineOptions || {}).filter((key) => !knownOptions.has(key));
	if (invalidKeys.length) {
		console.warn(`invalid plugin options "${invalidKeys.join(', ')}" in config`, inlineOptions);
	}
}

function mergeOptions(
    defaultOptions: Options,
	inlineOptions: Partial<Options>,
	viteConfig: UserConfig,
	viteEnv: ConfigEnv
): ResolvedOptions {
    return {
        ...defaultOptions,
        ...inlineOptions,
        css: {
            ...defaultOptions.css,
            ...inlineOptions.css
        },
        root: viteConfig.root!,
        isProduction: viteEnv.mode === 'production',
        isBuild: viteEnv.command === 'build',
        isServe: viteEnv.command === 'serve'
    };
}

export function resolveOptions(
	inlineOptions: Partial<Options> = {},
	viteConfig: UserConfig,
	viteEnv: ConfigEnv
): ResolvedOptions {
	const viteConfigWithResolvedRoot = {
		...viteConfig,
		root: resolveViteRoot(viteConfig)
	};
	const defaultOptions = buildDefaultOptions(viteEnv.mode === 'production', inlineOptions);
	return mergeOptions(
		defaultOptions,
		inlineOptions,
		viteConfigWithResolvedRoot,
		viteEnv
	);
}

// vite passes unresolved `root`option to config hook but we need the resolved value, so do it here
// https://github.com/sveltejs/vite-plugin-svelte/issues/113
// https://github.com/vitejs/vite/blob/43c957de8a99bb326afd732c962f42127b0a4d1e/packages/vite/src/node/config.ts#L293
function resolveViteRoot(viteConfig: UserConfig): string | undefined {
    return viteConfig.root ? path.resolve(viteConfig.root) : process.cwd();
}
