import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const baseConfig = {
  input: 'src/ezui.js',
  external: ['dompurify', 'validator'], // External dependencies
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    })
  ]
};

const configs = [];

// Development build
if (isDevelopment || !isProduction) {
  configs.push({
    ...baseConfig,
    output: {
      file: 'dist/ezui.js',
      format: 'umd',
      name: 'EZUI',
      sourcemap: true,
      globals: {
        'dompurify': 'DOMPurify',
        'validator': 'validator'
      }
    }
  });
  
  // ES Module build
  configs.push({
    ...baseConfig,
    output: {
      file: 'dist/ezui.esm.js',
      format: 'esm',
      sourcemap: true
    }
  });
}

// Production build
if (isProduction) {
  // Minified UMD build
  configs.push({
    ...baseConfig,
    output: {
      file: 'dist/ezui.min.js',
      format: 'umd',
      name: 'EZUI',
      sourcemap: true,
      globals: {
        'dompurify': 'DOMPurify',
        'validator': 'validator'
      }
    },
    plugins: [
      ...baseConfig.plugins,
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_functions: ['console.log', 'console.info', 'console.debug']
        },
        mangle: {
          reserved: ['EZUI']
        }
      })
    ]
  });
}

export default configs;