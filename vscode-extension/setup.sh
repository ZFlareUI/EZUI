#!/bin/bash

echo "Setting up EZUI VS Code Extension development environment..."

# Navigate to extension directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install

# Install VS Code Extension CLI if not present
if ! command -v vsce &> /dev/null; then
    echo "Installing VS Code Extension CLI..."
    npm install -g @vscode/vsce
fi

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

echo "Setup complete!"
echo ""
echo "To test the extension:"
echo "1. Open this folder in VS Code"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Open a .ezui file to test syntax highlighting"
echo ""
echo "To package the extension:"
echo "npm run package"
echo ""
echo "Sample EZUI files are available in the ../examples/ directory"