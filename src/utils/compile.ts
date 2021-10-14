import type { ParsedTemplate, CodeWithMap } from '@endorphinjs/template-compiler';
import type { ResolvedOptions, EndorphinRequest, EndorphinCompiler } from '../types';
import type EndorphinCache from './cache';

export function createCompiler(cache: EndorphinCache, options: ResolvedOptions): EndorphinCompiler {
	const endorphin = require('endorphin/compiler');

    return {
        stylesheet(filename: string, code: string, scope: string) {
            return endorphin.scopeCSS(code, scope, { filename });
        },
        template(req: EndorphinRequest, code: string) {
            const { id } = req;

            // Parse Endorphin template into AST
            const cssScope = options.css.scope(req.normalizedFilename);
            const componentName = options.componentName ? options.componentName(id) : '';
            const parsed = endorphin.parse(code, id, options.template) as ParsedTemplate;

            cache.add(req, parsed, cssScope);

            // Generate JavaScript code from template AST
            const result = endorphin.generate(parsed, {
                module: 'endorphin',
                cssScope,
                warn: (msg: string, pos?: number) => this.warn(msg, pos),
                component: componentName,
                ...options.template
            }) as CodeWithMap;

            parsed.ast.stylesheets.forEach(node => {
                if (node.url) {
                    result.code += `import "${node.url}";\n`
                }
            });

            return result;
        }
    };
}
