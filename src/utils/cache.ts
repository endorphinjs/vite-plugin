import fs from 'fs';
import path from 'path';
import type { ENDScript, ENDStylesheet } from '@endorphinjs/template-parser';
import type { ParsedTemplate } from '@endorphinjs/template-compiler';
import type { EndorphinRequest, EndorphinResourceType, ResolvedOptions } from '../types';

const defaultExt: Record<EndorphinResourceType, string> = {
    script: '.js',
    style: '.css'
};

export interface ExternalResource {
    type: EndorphinResourceType;
    path: string;
}

interface Cache {
    template: ParsedTemplate;
    scope: string;
    external: ExternalResource[];
    styles: Map<string, string | null>;
    scripts: Map<string, string | null>;
}

export default class EndorphinCache {
    private cache: Map<string, Cache> = new Map();

    constructor(public options: ResolvedOptions) {}

    add(req: EndorphinRequest, template: ParsedTemplate, scope: string): void {
        const external = getExternal(req.filename, template);

        // Make external urls relative so it won’t collide with node module resolve logic
        template.ast.stylesheets.forEach(node => {
            if (node.url && !node.url.startsWith('./') && !node.url.startsWith('..')) {
                node.url = `./${node.url}`;
            }
        });

        this.cache.set(req.normalizedFilename, {
            template,
            scope,
            external,
            styles: externalizeInlineResources(template.ast.stylesheets, req, this.options),
            scripts: externalizeInlineResources(template.ast.scripts, req, this.options),
        });
    }

    get(id: string): Cache | undefined {
        return this.cache.get(id);
    }

    loadStyle(id: string, file: string): string | undefined {
        const entry = this.get(id);
        if (entry && entry.styles.has(file)) {
            return entry.styles.get(file);
        }

        return this.loadExternal(id, file);
    }

    loadScript(id: string, file: string): string | undefined {
        const entry = this.get(id);
        if (entry && entry.scripts.has(file)) {
            return entry.scripts.get(file);
        }

        return this.loadExternal(id, file);
    }

    getScope(id: string): string | undefined {
        const entry = this.cache.get(id);
        if (entry) {
            return entry.scope;
        }
    }
    resolve(id: string, file: string): string {
        if (file.startsWith('/')) {
            file = file.slice(1);
        }

        const dir = path.dirname(id);
        return path.resolve(dir, file);
    }

    private loadExternal(id: string, file: string): string {
        return fs.readFileSync(this.resolve(id, file), 'utf-8');
    }
}

function externalizeInlineResources(nodes: Array<ENDScript | ENDStylesheet>, req: EndorphinRequest, options: ResolvedOptions): Map<string, string> {
    const result: Map<string, string> = new Map();
    nodes.forEach((node, i) => {
        if (node.content) {
            const type: EndorphinResourceType = node.type === 'ENDScript' ? 'script' : 'style';
            const ext = options.types[node.mime] || defaultExt[type];
            const key = `__${i}${ext}`;

            result.set(key, node.transformed || node.content);
            node.url = subResourceUrl(req, type, key);
            node.transformed = node.content = void 0;
        }
    });

    return result;
}

function subResourceUrl(req: EndorphinRequest, type: EndorphinResourceType, baseName: string): string {
    return `${req.normalizedFilename}?${type}=${baseName}`;
}

function getExternal(parent: string, template: ParsedTemplate): ExternalResource[] {
    const result: ExternalResource[] = [];
    const { scripts, stylesheets } = template.ast;
    const dirname = path.dirname(parent);
    scripts.forEach(node => {
        if (node.url && !isRemoteUrl(node.url)) {
            result.push({
                type: 'script',
                path: path.resolve(dirname, node.url)
            });
        }
    });

    stylesheets.forEach(node => {
        if (node.url && !isRemoteUrl(node.url)) {
            result.push({
                type: 'style',
                path: path.resolve(dirname, node.url)
            });
        }
    });

    return result;
}

function isRemoteUrl(url: string): boolean {
    return /^[a-z+-]:/.test(url);
}
