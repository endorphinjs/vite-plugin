import fs from 'fs';
import type { Plugin } from 'vite';
import postCSSPlugin from '@endorphinjs/postcss-plugin';
import { createCompiler } from './utils/compile';
import { buildIdParser } from './utils/id';
import { validateInlineOptions, resolveOptions } from './utils/options';
import EndorphinCache from './utils/cache';
import type { ResolvedOptions, Options, IdParser, EndorphinCompiler } from './types';

export function endorphin(inlineOptions?: Partial<Options>): Plugin {
	validateInlineOptions(inlineOptions);
	let cache: EndorphinCache;
	let requestParser: IdParser;
	let options: ResolvedOptions;
    let compile: EndorphinCompiler;

    const scopeLookup = new Map<string, string>();

    return {
        name: 'vite-plugin-endorphin',
        enforce: 'pre',
        config(config, configEnv) {
            options = resolveOptions(inlineOptions, config, configEnv);
            requestParser = buildIdParser(options);
            cache = new EndorphinCache(options);
            compile = createCompiler(cache, options);

            return {
                css: {
                    postcss: {
                        plugins: [postCSSPlugin({
                            scope: root => {
                                const file = root.source?.input.file;
                                if (file && scopeLookup.has(file)) {
                                    return scopeLookup.get(file);
                                }
                            },
                            classScope: inlineOptions?.template?.classScope
                        })]
                    }
                }
            }
        },

        async resolveId(importee, importer) {
            const req = requestParser(importee);

            if (req) {
                if (req.sub) {
                    return importee;
                }

                if (options.isBuild) {
                    // Requesting template: add query string to disable default
                    // Vite’s html plugin
                    const absPath = await this.resolve(req.filename, importer, { skipSelf: true });
                    return `${absPath.id}?endorphin`;
                }
            }
        },

        async load(id) {
            const req = requestParser(id);

            if (req?.sub) {
                const { sub } = req;
                if (sub.type === 'script') {
                    return cache.loadScript(req.filename, sub.file);
                }

                if (sub.type === 'style') {
                    return cache.loadStyle(req.filename, sub.file);
                }
            }

            if (req) {
                return fs.readFileSync(req.filename, 'utf-8');
            }
        },

        async transform(code, id) {
            const req = requestParser(id);
            if (req && !req.sub) {
                const result = await compile.template(req, code);
                const entry = cache.get(req.filename);
                if (entry) {
                    entry.external.forEach(file => {
                        if (file.type === 'style') {
                            scopeLookup.set(file.path, entry.scope);
                        }
                    });

                    if (options.astBase) {
                        const astPath = options.astBase(req.filename);
                        this.emitFile({
                            type: 'asset',
                            fileName: astPath,
                            source: JSON.stringify(entry.template.ast)
                        });
                    }
                }

                return result;
            }
        }

    };
}
