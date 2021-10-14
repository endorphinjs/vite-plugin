import path from 'path';
import { createFilter } from '@rollup/pluginutils';
import type { FilterPattern } from '@rollup/pluginutils';
import type { IdParser, ResolvedOptions, EndorphinRequest, EndorphinResourceType, ComponentSubresource } from '../types';

function parseToEndorphinRequest(id: string, filename: string, query: string, root: string, timestamp: number): EndorphinRequest | undefined {
	return {
		id,
		filename,
		root,
		normalizedFilename: normalize(filename, root),
		sub: parseSubResource(query),
		timestamp,
	};
}

function parseSubResource(query = ''): ComponentSubresource | undefined {
	const [type, file] = query.split('=', 2);
	if (type && file) {
		return {
			type: type as EndorphinResourceType,
			file
		};
	}
}

function normalize(filename: string, normalizedRoot: string) {
	return stripRoot(path.normalize(filename), normalizedRoot);
}

function stripRoot(normalizedFilename: string, normalizedRoot: string) {
	return normalizedFilename.startsWith(normalizedRoot + '/')
		? normalizedFilename.slice(normalizedRoot.length)
		: normalizedFilename;
}

function buildFilter(include: FilterPattern, exclude: FilterPattern, extensions: string[]): (filename: string) => boolean {
	const rollupFilter = createFilter(include, exclude);
	return (filename) => rollupFilter(filename) && extensions.some((ext) => filename.endsWith(ext));
}

export function buildIdParser(options: ResolvedOptions): IdParser {
	const { include, exclude, extensions, root } = options;
	const normalizedRoot = path.normalize(root);
	const filter = buildFilter(include, exclude, extensions!);

	return (id, timestamp = Date.now()) => {
		const [filename, rawQuery] = id.split(`?`, 2);

		if (filter(filename)) {
			return parseToEndorphinRequest(id, filename, rawQuery, normalizedRoot, timestamp);
		}
	};
}
