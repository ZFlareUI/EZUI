/**
 * EZUI Build Tool
 * Compiles .ezu components for production
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join, resolve, relative, extname, basename } from 'path';
import { EZUIParser } from './src/parser/parser.js';
import { EZUICompiler } from './src/parser/compiler.js';

class EZUIBuilder {
  constructor(options = {}) {
    this.inputDir = options.input || 'src';
    this.outputDir = options.output || 'dist';
    this.parser = new EZUIParser();
    this.compiler = new EZUICompiler();
    this.components = new Map();
  }

  async build() {
    console.log('Building EZUI project...');

buildProject()
  .then(() => {
    console.log('Build complete!');
  })
  .catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });
  }

  async findEzuFiles() {
    const ezuFiles = [];
    
    const searchDir = async (dir) => {
      try {
        const entries = await readdir(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await searchDir(fullPath);
          } else if (entry.endsWith('.ezu')) {
            ezuFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    };
    
    await searchDir('./');
    
    console.log(`Found ${ezuFiles.length} .ezu files`);
    
    for (const file of ezuFiles) {
      await this.parseEzuFile(file);
    }
  }

  async parseEzuFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = this.parser.parse(content);
      
      this.components.set(filePath, {
        path: filePath,
        parsed: parsed,
        relativePath: relative(process.cwd(), filePath)
      });
      
      console.log(`Parsed: ${relative(process.cwd(), filePath)}`);
      
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error.message);
      throw error;
    }
  }

  async compileComponents() {
    const compiledComponents = [];
    
    for (const [filePath, component] of this.components.entries()) {
      try {
        const compiled = this.compiler.compile(component.parsed);
        const componentName = this.getComponentName(component.parsed.name);
        
        const compiledCode = this.generateComponentCode(componentName, compiled);
        
        compiledComponents.push({
          name: componentName,
          code: compiledCode,
          path: component.relativePath
        });
        
        console.log(`Compiled: ${componentName}`);
        
      } catch (error) {
        console.error(`Failed to compile ${filePath}:`, error.message);
        throw error;
      }
    }
    
    this.compiledComponents = compiledComponents;
  }

  generateComponentCode(name, compiledClass) {
    // Convert the compiled class to a string representation
    const classCode = compiledClass.toString();
    
    return `
// Component: ${name}
const ${this.toCamelCase(name)}Component = ${classCode};

// Auto-register component
if (typeof window !== 'undefined' && window.ezui) {
  window.ezui.registry.register('${name}', ${this.toCamelCase(name)}Component);
}

export { ${this.toCamelCase(name)}Component };
    `.trim();
  }

  async generateBundle() {
    // Generate main bundle file
    const bundleCode = this.generateBundleCode();
    await writeFile(join(this.outputDir, 'ezui-components.js'), bundleCode);
    
    // Generate individual component files
    for (const component of this.compiledComponents) {
      const outputPath = join(this.outputDir, 'components', `${component.name}.js`);
      await mkdir(join(this.outputDir, 'components'), { recursive: true });
      await writeFile(outputPath, component.code);
    }
    
    // Copy core framework files
    const coreFiles = [
      'src/ezui.js',
      'src/runtime/reactivity.js',
      'src/runtime/component.js',
      'src/runtime/dom.js'
    ];
    
    for (const file of coreFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const outputPath = join(this.outputDir, basename(file));
        await writeFile(outputPath, content);
      } catch (error) {
        console.warn(`Could not copy ${file}: ${error.message}`);
      }
    }
  }

  generateBundleCode() {
    const imports = this.compiledComponents.map(comp => 
      `import { ${this.toCamelCase(comp.name)}Component } from './components/${comp.name}.js';`
    ).join('\n');
    
    const registrations = this.compiledComponents.map(comp =>
      `  ezui.registry.register('${comp.name}', ${this.toCamelCase(comp.name)}Component);`
    ).join('\n');
    
    return `
// EZUI Components Bundle
// Auto-generated at ${new Date().toISOString()}

import { EZUI } from './ezui.js';

${imports}

// Initialize EZUI and register all components
const ezui = new EZUI();

// Register components
${registrations}

console.log('EZUI Components Bundle loaded with ${this.compiledComponents.length} components');

export { ezui };
export default ezui;
    `.trim();
  }

  async copyAssets() {
    // Copy HTML files and update script references
    const htmlFiles = await this.findHtmlFiles();
    
    for (const htmlFile of htmlFiles) {
      await this.processHtmlFile(htmlFile);
    }
  }

  async findHtmlFiles() {
    const htmlFiles = [];
    
    const searchDir = async (dir) => {
      try {
        const entries = await readdir(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
            await searchDir(fullPath);
          } else if (entry.endsWith('.html')) {
            htmlFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    };
    
    await searchDir('./');
    return htmlFiles;
  }

  async processHtmlFile(filePath) {
    try {
      let content = await readFile(filePath, 'utf-8');
      
      // Update script src paths to point to dist files
      content = content.replace(/src="src\/ezui\.js"/g, 'src="ezui-components.js"');
      content = content.replace(/src="([^"]*\.ezu)"/g, ''); // Remove .ezu script tags
      content = content.replace(/<script[^>]*type="text\/ezu"[^>]*><\/script>/g, ''); // Remove ezu script tags
      
      // Add production bundle script
      if (!content.includes('ezui-components.js')) {
        content = content.replace(
          /<script[^>]*src="src\/ezui\.js"[^>]*><\/script>/,
          '<script type="module" src="ezui-components.js"></script>'
        );
      }
      
      const outputPath = join(this.outputDir, basename(filePath));
      await writeFile(outputPath, content);
      
      console.log(`Processed: ${basename(filePath)}`);
      
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error.message);
    }
  }

  getComponentName(name) {
    if (!name) return 'ezui-component';
    return name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
  }

  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
              .replace(/^[a-z]/, match => match.toUpperCase());
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new EZUIBuilder({
    input: process.argv[2] || 'src',
    output: process.argv[3] || 'dist'
  });
  
  builder.build();
}

export { EZUIBuilder };