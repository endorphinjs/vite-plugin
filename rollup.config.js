import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

/**
 * @type {import('rollup').RollupOptions}
 */
const plugin = {
    input: './src/index.ts',
    plugins: [resolve(), commonjs(), typescript()],
    external: ['@endorphinjs/postcss-plugin', '@rollup/pluginutils'],
    output: [{
        dir: './out',
        format: 'commonjs',
        sourcemap: true
    }]
};

export default plugin;