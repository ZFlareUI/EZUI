# EZUI Framework Documentation

## Table of Contents

- [Getting Started](#getting-started)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Event Handling](#event-handling)
- [Styling](#styling)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Getting Started

### Installation

1. Clone or download the EZUI framework
2. Include the framework in your HTML:

```html
<script type="module" src="src/ezui.js"></script>
```

### Creating Your First Component

Create a file with `.ezu` extension:

```ezu
<component HelloWorld.ezu>

style {
  .greeting {
    color: #007acc
    font-size: 24px
    text-align: center
  }
}

state {
  name: "World"
}

template {
  <div class="greeting">
    Hello, {name}!
  </div>
}
```

### Using Components in HTML

```html
<ezui-helloworld></ezui-helloworld>
```

## Component Structure

Every EZUI component consists of three main blocks:

### 1. Style Block

Define scoped CSS for your component:

```ezu
style {
  .container {
    padding: 20px
    background: #f5f5f5
  }
  
  button {
    background: #007acc
    color: white
    border: none
    padding: 10px 20px
  }
  
  button:hover {
    background: #005a9e
  }
}
```

**Features:**
- Automatically scoped to the component
- Supports all CSS properties and selectors
- Pseudo-classes (`:hover`, `:focus`, etc.)
- No need for CSS modules or styled-components

### 2. State Block

Define reactive data properties:

```ezu
state {
  count: 0
  user: {
    name: "John"
    age: 25
  }
  items: ["apple", "banana", "orange"]
  isVisible: true
}
```

**Supported Types:**
- Numbers: `42`, `3.14`
- Strings: `"hello"`, `'world'`
- Booleans: `true`, `false`
- Objects: `{ key: "value" }`
- Arrays: `[1, 2, 3]`

### 3. Template Block

Define the component's HTML structure:

```ezu
template {
  <div class="component">
    <h2>Count: {count}</h2>
    <button on:click="count++">Increment</button>
    <button on:click="count--">Decrement</button>
    <button on:click="count = 0">Reset</button>
  </div>
}
```

## State Management

### Reactive Updates

State changes automatically trigger re-renders:

```ezu
state {
  message: "Hello"
  counter: 0
}

template {
  <div>
    <p>{message}</p>
    <button on:click="message = 'Updated!'">Change Message</button>
    <button on:click="counter++">Count: {counter}</button>
  </div>
}
```

### Complex State Operations

```ezu
state {
  user: {
    name: ""
    email: ""
  }
  todos: []
}

template {
  <div>
    <input on:input="user.name = event.target.value" />
    <button on:click="addTodo()">Add Todo</button>
  </div>
}
```

## Event Handling

### Basic Events

```ezu
template {
  <button on:click="count++">Click me</button>
  <input on:input="handleInput(event)" />
  <form on:submit="handleSubmit(event)">
    <button type="submit">Submit</button>
  </form>
}
```

### Event Types

- `on:click` - Mouse clicks
- `on:input` - Input changes
- `on:change` - Select/checkbox changes
- `on:submit` - Form submissions
- `on:keydown` - Key presses
- `on:focus` - Element focus
- `on:blur` - Element blur

### Event Handlers

#### Simple Expressions
```ezu
on:click="count++"
on:click="count--"
on:click="count = 0"
on:click="isVisible = !isVisible"
```

#### Function Calls
```ezu
on:click="handleClick()"
on:input="updateName(event.target.value)"
on:submit="submitForm(event)"
```

## Styling

### Scoped CSS

All styles are automatically scoped to the component:

```ezu
style {
  .button {
    background: blue;  /* Only affects this component */
  }
}
```

### CSS Properties

Use standard CSS property names (kebab-case or camelCase):

```ezu
style {
  .element {
    background-color: red
    font-size: 16px
    margin-top: 20px
    border-radius: 4px
  }
}
```

### Pseudo-selectors

```ezu
style {
  button:hover {
    background: #005a9e
  }
  
  input:focus {
    border-color: #007acc
  }
  
  .item:nth-child(even) {
    background: #f0f0f0
  }
}
```

## API Reference

### EZUI Class

```javascript
// Manual component registration
await EZUI.register('my-component', ezuContent);

// Load component from URL
await EZUI.load('/components/my-component.ezu');
```

### Component Instance

```javascript
// Access component instance
const element = document.querySelector('my-component');
const component = element._ezuiComponent;

// Access state
console.log(component.state.data);

// Update state
component.state.update('count', 10);

// Listen to state changes
component.state.onChange((data, changes) => {
  console.log('State changed:', changes);
});
```

### Lifecycle Hooks

```javascript
class MyComponent extends EZUIComponent {
  onMount() {
    console.log('Component mounted');
  }
  
  onUnmount() {
    console.log('Component unmounted');
  }
}
```

## Best Practices

### 1. Component Naming

- Use PascalCase for component names: `UserProfile.ezu`
- Component tags become kebab-case: `<user-profile></user-profile>`

### 2. State Management

- Keep state minimal and flat when possible
- Use computed properties for derived data
- Batch related state updates

### 3. Event Handling

- Use simple expressions for basic operations
- Create methods for complex logic
- Always prevent default for form submissions

### 4. Styling

- Use semantic class names
- Avoid deep nesting in CSS
- Use CSS custom properties for theming

### 5. Performance

- Minimize state changes
- Use event delegation for large lists
- Debounce expensive operations

## Examples

### Counter Component

```ezu
<component Counter.ezu>

style {
  .counter {
    text-align: center
    padding: 20px
  }
  
  button {
    font-size: 18px
    padding: 10px 20px
    margin: 0 5px
    border: none
    border-radius: 4px
    cursor: pointer
  }
  
  .increment { background: #27ae60; color: white; }
  .decrement { background: #e74c3c; color: white; }
  .reset { background: #34495e; color: white; }
}

state {
  count: 0
}

template {
  <div class="counter">
    <h2>Count: {count}</h2>
    <button class="increment" on:click="count++">+</button>
    <button class="decrement" on:click="count--">-</button>
    <button class="reset" on:click="count = 0">Reset</button>
  </div>
}
```

### Todo List Component

```ezu
<component TodoList.ezu>

style {
  .todo-app {
    max-width: 400px
    margin: 0 auto
    padding: 20px
  }
  
  .input-group {
    display: flex
    gap: 10px
    margin-bottom: 20px
  }
  
  input {
    flex: 1
    padding: 10px
    border: 1px solid #ddd
    border-radius: 4px
  }
  
  .add-btn {
    padding: 10px 20px
    background: #007acc
    color: white
    border: none
    border-radius: 4px
    cursor: pointer
  }
  
  .todo-item {
    display: flex
    align-items: center
    padding: 10px
    margin-bottom: 5px
    background: #f5f5f5
    border-radius: 4px
  }
  
  .todo-item.completed {
    text-decoration: line-through
    opacity: 0.6
  }
  
  .delete-btn {
    background: #e74c3c
    color: white
    border: none
    padding: 5px 10px
    border-radius: 3px
    cursor: pointer
    margin-left: 10px
  }
}

state {
  todos: []
  newTodo: ""
  nextId: 1
}

template {
  <div class="todo-app">
    <h2>Todo List</h2>
    
    <div class="input-group">
      <input 
        value="{newTodo}"
        on:input="newTodo = event.target.value"
        on:keypress="event.key === 'Enter' ? addTodo() : null"
        placeholder="Add a new todo..."
      />
      <button class="add-btn" on:click="addTodo()">Add</button>
    </div>
    
    <div class="todo-list">
      <!-- Todo items would be rendered here -->
      <!-- In a future version, we'll add list rendering -->
    </div>
    
    <p>Total todos: {todos.length}</p>
  </div>
}
```

## Advanced Features

### Component Communication

```javascript
// Emit custom events
this.emit('user-selected', userData);

// Listen to events
this.on('user-selected', (data) => {
  console.log('User selected:', data);
});
```

### Hot Reloading

EZUI supports hot reloading during development:

```bash
npm run dev  # Start dev server with hot reload
```

### Build for Production

```bash
npm run build  # Build optimized version
```

This generates a production-ready bundle with all components compiled and optimized.

## Browser Support

EZUI works in all modern browsers that support:

- ES6 Modules
- Custom Elements
- Shadow DOM
- Proxy objects

**Supported Browsers:**
- Chrome 61+
- Firefox 63+
- Safari 10.1+
- Edge 79+

For older browsers, you'll need to include polyfills for these features.