import type { ViteDevServer } from 'vite';
import type { CompileOptions, CodeWithMap } from '@endorphinjs/template-compiler';
import type { SourceMapGenerator } from 'source-map';

type PluginCompileOptions = CompileOptions & { helpers: string[] | HelpersMap }

type TransformedResource = string | Buffer | {
    code?: string | Buffer,
    css?: string | Buffer,
    map?: any
};

type HelpersMap = Record<string, string[]>;

interface ResourceTransformer {
    (type: string, code: string, filename: string): TransformedResource | Promise<TransformedResource>;
}

interface CSSBundleHandler {
    (code: string, map?: SourceMapGenerator): void;
}

export interface Options {
    /**
     * List of file extensions which should be treated as Endorphin template.
     * Default are `.html` and `.end`
     */
    extensions?: string[],
    include?: string | string[],
    exclude?: string | string[],

    emitCss?: boolean;

    /**
     * If given, emits template AST JSON into given path.
     * This function accepts template module ID and should return path where AST
     * should be stored
     */
    astBase?: (id: string) => string;

    /** Mapping of type attributes of style and script tags to extension */
    types: Record<string, string>;

    /** Additional options for template compiler */
    template?: PluginCompileOptions;

    /** Generates component name from given module identifier */
    componentName?: (id: string) => string;

    /** Custom entries of module (to replace base rollup entry) */
    entries?: string[],

    /** Options for CSS processing */
    css?: CSSOptions;
}

export interface CSSOptions {
    /** A function to transform stylesheet code. */
    preprocess?: ResourceTransformer;

    /** A function that returns a CSS scope token from given component file path */
    scope?: (fileName: string) => string;

    /** CSS bundle and its source map */
    bundle?: CSSBundleHandler;
}

export interface ResolvedOptions extends Options {
    // extra options
    root: string;
    isProduction: boolean;
    isBuild: boolean;
    isServe: boolean;
    server?: ViteDevServer;
}

export type EndorphinResourceType = 'style' | 'script';

export type IdParser = (id: string, timestamp?: number) => EndorphinRequest | undefined;

export interface EndorphinRequest {
    id: string;
    root: string;
    filename: string;
    normalizedFilename: string;
    sub?: ComponentSubresource;
    timestamp: number;
}

export interface ComponentSubresource {
    type: EndorphinResourceType;
    file: string;
}

export interface EndorphinCompiler {
    stylesheet(filename: string, code: string, scope: string): string | CodeWithMap | Promise<string | CodeWithMap>;
    template(req: EndorphinRequest, code: string): string | CodeWithMap | Promise<string | CodeWithMap>;
}