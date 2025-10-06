# EZUI Framework

## Project Overview

**EZUI** is a lightweight, intuitive web framework that seamlessly combines JavaScript, HTML, and CSS with a unique, minimal syntax using `.ezu` files. It provides reactive components with scoped styling and minimal setup requirements.

## Key Features

- **Component-Based Architecture**: Build UIs with reusable `.ezu` components
- **Reactive State Management**: Auto-updates when state changes
- **Scoped CSS**: Styles stay within components, avoiding global conflicts
- **Minimal Setup**: No complex build process required
- **Intuitive Syntax**: Easy-to-read component files
- **Hot Reloading**: Development server with live updates
- **Build Tools**: Production-ready compilation
- **Testing Suite**: Comprehensive test framework

## Project Structure

```
ezui-framework/
├── src/                          # Core framework source
│   ├── parser/
│   │   ├── lexer.js             # Tokenizes .ezu files
│   │   ├── parser.js            # Parses .ezu syntax into AST
│   │   └── compiler.js          # Compiles AST to JavaScript
│   ├── runtime/
│   │   ├── reactivity.js        # Reactive state system
│   │   ├── component.js         # Component registry & lifecycle
│   │   └── dom.js               # DOM manipulation utilities
│   └── ezui.js                  # Main framework entry point
├── examples/                     # Example components & demos
│   ├── counter.ezu              # Counter component example
│   ├── todo.ezu                 # Todo list example
│   ├── form.ezu                 # Form handling example
│   └── index.html               # Comprehensive demo page
├── tests/                       # Test suite
│   └── ezui.test.js            # Framework tests
├── docs/                        # Documentation
│   └── README.md               # Comprehensive guide
├── dev-server.js               # Development server with hot reload
├── simple-server.js            # Simple HTTP server for testing
├── build.js                    # Production build tool
├── test.html                   # Simple test page
└── README.md                   # Main documentation
```

## Quick Start

### 1. Installation

No installation required! Just include the framework:

```html
<script type="module" src="src/ezui.js"></script>
```

### 2. Create Your First Component

Create a `MyComponent.ezu` file:

```ezu
<component MyComponent.ezu>

style {
  .greeting {
    color: #007acc
    font-size: 24px
    text-align: center
    padding: 20px
  }
  
  button {
    background: #27ae60
    color: white
    border: none
    padding: 10px 20px
    border-radius: 4px
    cursor: pointer
  }
  
  button:hover {
    background: #229954
  }
}

state {
  name: "World"
  clickCount: 0
}

template {
  <div class="greeting">
    <h2>Hello, {name}!</h2>
    <p>Button clicked {clickCount} times</p>
    <button on:click="clickCount++">Click me!</button>
    <button on:click="name = 'EZUI'">Change Name</button>
  </div>
}
```

### 3. Use in HTML

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="src/ezui.js"></script>
    <script type="text/ezu" src="MyComponent.ezu"></script>
</head>
<body>
    <ezui-mycomponent></ezui-mycomponent>
</body>
</html>
```

## Development

### Start Development Server

```bash
npm run dev
# or
node simple-server.js
```

Visit `http://localhost:3000` to see your components in action.

### Run Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
```

This creates an optimized bundle in the `dist/` directory.

## Component Syntax

### Basic Structure

Every `.ezu` component has three main blocks:

```ezu
<component ComponentName.ezu>

style {
  /* Scoped CSS */
}

state {
  /* Reactive data */
}

template {
  /* HTML with bindings */
}
```

### State Management

```ezu
state {
  count: 0
  user: {
    name: "John"
    email: "john@example.com"
  }
  items: ["apple", "banana"]
  isVisible: true
}
```

### Event Handling

```ezu
template {
  <button on:click="count++">Increment</button>
  <button on:click="count = 0">Reset</button>
  <input on:input="user.name = event.target.value" />
  <form on:submit="handleSubmit(event)">
    <button type="submit">Submit</button>
  </form>
}
```

### Interpolation

```ezu
template {
  <div>
    <h1>{user.name}</h1>
    <p>Count: {count}</p>
    <p>Total items: {items.length}</p>
  </div>
}
```

## Styling

### Scoped CSS

All styles are automatically scoped to the component:

```ezu
style {
  .container {
    background: #f5f5f5;  /* Only affects this component */
  }
  
  button {
    color: blue;          /* Scoped to component buttons */
  }
  
  button:hover {
    color: darkblue;
  }
}
```

## API Reference

### Global API

```javascript
// Load component from URL
await EZUI.load('/components/my-component.ezu');

// Register component manually
await EZUI.register('my-component', ezuContent);
```

### Component Instance

```javascript
const element = document.querySelector('my-component');
const component = element._ezuiComponent;

// Access state
console.log(component.state.data);

// Update state
component.state.update('count', 10);

// Listen to changes
component.state.onChange((data, changes) => {
  console.log('State changed:', changes);
});
```

## Examples

### Counter Component

```ezu
<component Counter.ezu>

style {
  .counter { text-align: center; padding: 20px; }
  button { margin: 5px; padding: 10px 20px; }
  .increment { background: #27ae60; color: white; }
  .decrement { background: #e74c3c; color: white; }
}

state {
  count: 0
}

template {
  <div class="counter">
    <h2>Count: {count}</h2>
    <button class="increment" on:click="count++">+</button>
    <button class="decrement" on:click="count--">-</button>
    <button on:click="count = 0">Reset</button>
  </div>
}
```

### Form Component

```ezu
<component ContactForm.ezu>

style {
  .form { max-width: 400px; margin: 0 auto; }
  input { width: 100%; padding: 10px; margin: 5px 0; }
  button { background: #007acc; color: white; padding: 10px 20px; }
}

state {
  formData: {
    name: ""
    email: ""
  }
  isSubmitting: false
}

template {
  <form class="form" on:submit="handleSubmit(event)">
    <input 
      type="text" 
      placeholder="Name"
      value="{formData.name}"
      on:input="formData.name = event.target.value"
    />
    <input 
      type="email" 
      placeholder="Email"
      value="{formData.email}"
      on:input="formData.email = event.target.value"
    />
    <button type="submit" disabled="{isSubmitting}">
      {isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
  </form>
}
```

## Browser Support

- Chrome 61+
- Firefox 63+
- Safari 10.1+
- Edge 79+

Requires support for:
- ES6 Modules
- Custom Elements
- Shadow DOM
- Proxy objects

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by modern web frameworks like React, Vue, and Svelte
- Built with vanilla JavaScript for maximum compatibility
- Designed for simplicity and developer experience

## Future Roadmap

- [ ] List rendering (`for` loops in templates)
- [ ] Conditional rendering (`if` statements)
- [ ] Component props and communication
- [ ] Lifecycle hooks
- [ ] Plugin system
- [ ] TypeScript support
- [ ] Developer tools browser extension
- [ ] Performance optimizations
- [ ] SSR (Server-Side Rendering)

---

**Happy coding with EZUI!**