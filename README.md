# EZUI Framework

[![NPM Version](https://img.shields.io/npm/v/ezui-framework.svg)](https://www.npmjs.com/package/ezui-framework)
[![Build Status](https://img.shields.io/github/workflow/status/ezui/framework/CI)](https://github.com/ezui/framework/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/ezui/framework.svg)](https://codecov.io/gh/ezui/framework)
[![License](https://img.shields.io/npm/l/ezui-framework.svg)](https://github.com/ezui/framework/blob/main/LICENSE)

A production-ready reactive web framework with comprehensive validation, security, and development tools. EZUI provides enterprise-level features while maintaining simplicity and performance.

## Features

### **Production-Ready Architecture**
- **Comprehensive validation system** with built-in validators and sanitizers
- **Enterprise-level security** with XSS prevention and input sanitization
- **Advanced error handling** with global error boundaries and recovery mechanisms
- **Performance monitoring** with render tracking and memory management
- **Full TypeScript support** with comprehensive type definitions

### **Reactive State Management**
- **Reactive state system** with automatic dependency tracking
- **Middleware support** for state transformations and side effects
- **Transaction support** with rollback capabilities
- **Undo/Redo functionality** for complex applications
- **State persistence** with automatic serialization

### **Security & Validation**
- **Input sanitization** using DOMPurify integration
- **Expression validation** with safe evaluation contexts
- **CSRF protection** and security headers
- **Content Security Policy** integration
- **Comprehensive validation rules** for forms and data

### **Development Experience**
- **Advanced dev tools** with visual debugging panel
- **Hot reload support** for rapid development
- **Comprehensive testing framework** with component testing utilities
- **Performance profiling** with detailed metrics
- **Component inspector** with state and lifecycle tracking

### **Performance**
- **Optimized rendering** with minimal DOM updates
- **Memory management** with automatic cleanup
- **Code splitting** support for large applications
- **Bundle optimization** with tree shaking
- **Performance budgets** and monitoring

## Installation

```bash
npm install ezui-framework
```

Or with yarn:

```bash
yarn add ezui-framework
```

## Quick Start

### Basic Component

```javascript
import { EZUI } from 'ezui-framework';

// Initialize EZUI
const ezui = new EZUI({
  enableValidation: true,
  enableSecurity: true,
  enableDevTools: process.env.NODE_ENV === 'development'
});

// Create a simple counter component
class Counter {
  constructor(props = {}) {
    this.props = props;
    this.state = ezui.createState({
      count: props.initialCount || 0
    });
    
    // Add validation
    this.state.addValidation('count', (value) => {
      if (typeof value !== 'number') {
        throw new Error('Count must be a number');
      }
      if (value < 0) {
        throw new Error('Count cannot be negative');
      }
      return true;
    });
  }
  
  increment() {
    this.state.set('count', this.state.get('count') + 1);
  }
  
  decrement() {
    this.state.set('count', this.state.get('count') - 1);
  }
  
  render() {
    const count = this.state.get('count');
    return `
      <div class="counter">
        <h2>Counter: ${count}</h2>
        <button class="increment">+</button>
        <button class="decrement">-</button>
      </div>
    `;
  }
  
  mount(parent) {
    this.element = document.createElement('div');
    this.element.innerHTML = this.render();
    parent.appendChild(this.element);
    
    // Bind events
    this.element.querySelector('.increment').onclick = () => this.increment();
    this.element.querySelector('.decrement').onclick = () => this.decrement();
    
    // Setup reactive updates
    this.state.on('count', () => this.update());
    
    return this;
  }
  
  update() {
    if (this.element) {
      this.element.innerHTML = this.render();
      // Rebind events after update
      this.element.querySelector('.increment').onclick = () => this.increment();
      this.element.querySelector('.decrement').onclick = () => this.decrement();
    }
  }
  
  unmount() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Register and mount component
ezui.component('counter', Counter);

// Mount to DOM
ezui.mount('counter', document.getElementById('app'), {
  initialCount: 5
}).then(instance => {
  console.log('Counter mounted:', instance);
}).catch(error => {
  console.error('Failed to mount counter:', error);
});
```

### Advanced State Management

```javascript
import { ReactiveState } from 'ezui-framework';

// Create reactive state with validation
const appState = new ReactiveState({
  user: {
    name: '',
    email: '',
    preferences: {
      theme: 'light',
      language: 'en'
    }
  },
  todos: [],
  ui: {
    loading: false,
    error: null
  }
});

// Add validation rules
appState.addValidation('user.email', (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return true;
});

// Add middleware for logging
appState.applyMiddleware((key, newValue, oldValue, next) => {
  console.log(`State change: ${key}`, { oldValue, newValue });
  next(newValue);
});

// Transaction support
appState.transaction(() => {
  appState.set('user.name', 'John Doe');
  appState.set('user.email', 'john@example.com');
  appState.set('ui.loading', false);
});

// Undo/Redo support
appState.enableHistory();
appState.set('user.name', 'Jane Doe');
appState.undo(); // Reverts to 'John Doe'
appState.redo(); // Back to 'Jane Doe'

// Watch for changes
appState.on('user.name', (newName, oldName) => {
  console.log(`User name changed from ${oldName} to ${newName}`);
});

// Batch updates
appState.batch(() => {
  appState.set('ui.loading', true);
  appState.set('ui.error', null);
  // All changes are applied together
});
```

## Architecture

### Core Components

- **EZUI Core**: Main framework class with component registration and lifecycle management
- **ReactiveState**: Advanced state management with validation, middleware, and transactions
- **EZUICompiler**: Secure template compilation with XSS prevention
- **EZUIValidator**: Comprehensive validation system with built-in and custom rules
- **EZUILogger**: Production-ready logging with multiple output targets
- **EZUIDevTools**: Advanced development tools with visual debugging

### Security Features

- **XSS Prevention**: Automatic HTML sanitization using DOMPurify
- **Input Validation**: Comprehensive validation rules and sanitizers
- **Safe Expression Evaluation**: Sandboxed expression execution
- **Security Headers**: Automatic CSP and security header management
- **CSRF Protection**: Built-in cross-site request forgery protection

### Performance Features

- **Optimized Rendering**: Minimal DOM updates with intelligent diffing
- **Memory Management**: Automatic cleanup and garbage collection
- **Performance Monitoring**: Real-time performance metrics and alerting
- **Code Splitting**: Dynamic imports and lazy loading support
- **Bundle Optimization**: Tree shaking and dead code elimination

## Testing

EZUI includes a comprehensive testing framework:

```javascript
import { createTestRunner, expect } from 'ezui-framework/testing';

const testRunner = createTestRunner();

testRunner.describe('Counter Component', () => {
  testRunner.it('should increment count when button is clicked', async () => {
    const wrapper = await testRunner.mountComponent(Counter, { initialCount: 0 });
    
    expect(wrapper.text()).toContain('Counter: 0');
    
    await wrapper.click('.increment');
    
    expect(wrapper.text()).toContain('Counter: 1');
    expect(wrapper.getState('count')).toBe(1);
  });
  
  testRunner.it('should validate negative counts', async () => {
    const wrapper = await testRunner.mountComponent(Counter);
    
    expect(() => {
      wrapper.setState('count', -1);
    }).toThrow('Count cannot be negative');
  });
});

// Run tests
testRunner.run().then(results => {
  console.log('Test results:', results);
});
```

## Build & Deploy

### Development

```bash
npm run dev          # Start development server with hot reload
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

### Production

```bash
npm run build        # Build for production
npm run test:ci      # Run tests for CI
npm run analyze      # Analyze bundle size
```

### Bundle Outputs

- `dist/ezui.js` - Development UMD build
- `dist/ezui.min.js` - Production UMD build (minified)
- `dist/ezui.esm.js` - ES Module build
- `dist/ezui.cjs.js` - CommonJS build

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Documentation](https://ezui.dev/docs)
- [Discord Community](https://discord.gg/ezui)
- [Issue Tracker](https://github.com/ezui/framework/issues)
- [Email Support](mailto:support@ezui.dev)

## Acknowledgments

- Inspired by modern frameworks like React, Vue, and Svelte
- Security features powered by DOMPurify
- Validation system inspired by Joi and Yup
- Development tools inspired by Vue DevTools and React DevTools

---

**Built with care by the EZUI Team**