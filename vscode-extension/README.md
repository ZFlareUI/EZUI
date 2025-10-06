# EZUI Language Support for VS Code

This extension provides comprehensive language support for EZUI framework files (`.ezui`), including syntax highlighting, IntelliSense, code completion, and more.

## Features

### Syntax Highlighting
- Full syntax highlighting for EZUI component files
- Support for all EZUI blocks: `component`, `state`, `style`, `template`, `script`
- Embedded language support for JavaScript, CSS, and HTML
- Proper highlighting of interpolation expressions `{variable}`

### 🧠 IntelliSense & Code Completion
- Auto-completion for EZUI keywords and blocks
- HTML element completion with proper closing tags
- Snippet support for common EZUI patterns
- Hover information for EZUI keywords

### Development Tools
- **Compile Command**: `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac) to compile EZUI files
- **Preview Command**: Right-click on `.ezui` files to preview components
- Context menu integration for EZUI files

### 🔍 Validation & Diagnostics
- Real-time validation of EZUI syntax
- Error highlighting and warnings
- Bracket matching and auto-closing

### 📝 Language Configuration
- Smart indentation for EZUI blocks
- Auto-closing of brackets, quotes, and tags
- Comment support (`//` and `/* */`)

## Installation

### From Source
1. Clone or download this extension
2. Open in VS Code
3. Press `F5` to run in development mode, or
4. Run `npm install && npm run compile` then package with `vsce package`

### Configuration

The extension supports the following settings:

```json
{
  "ezui.validate": true,        // Enable validation
  "ezui.format": true,          // Enable formatting
  "ezui.autocomplete": true     // Enable autocomplete
}
```

## EZUI Syntax Overview

EZUI files use a component-based structure:

```ezui
<component ComponentName.ezui>

state {
  // Reactive state variables
  message: "Hello World",
  count: 0
}

style {
  /* Scoped CSS styles */
  .container {
    padding: 20px;
  }
}

template {
  <!-- HTML template with interpolation -->
  <div class="container">
    <p>{message}</p>
    <button onclick="{increment}">Count: {count}</button>
  </div>
}

script {
  // Component logic and methods
  increment() {
    this.count++;
  }
}

</component>
```

## Commands

- **EZUI: Compile File** - Compiles the current EZUI file to JavaScript
- **EZUI: Preview Component** - Opens a preview of the EZUI component

## Keyboard Shortcuts

- `Ctrl+Shift+E` / `Cmd+Shift+E` - Compile current EZUI file

## File Association

The extension automatically associates `.ezui` files with the EZUI language mode.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please visit our [GitHub repository](https://github.com/ezui/vscode-extension).

---

**Enjoy coding with EZUI!**