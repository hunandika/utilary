# Contributing to RedLock

Thank you for your interest in contributing to this project! This document will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`

## Project Structure

```
src/
├── index.ts      # Barrel export - main entry point
├── redlock.ts    # RedLock class implementation
└── types.ts      # Type definitions
```

## Code Style

This project uses ESLint 9 (flat config) and Prettier for code formatting and linting.

### Available Scripts

- `npm run format` - Format all TypeScript, JavaScript, JSON, and Markdown files
- `npm run format:check` - Check if files are properly formatted (useful for CI)
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run format:lint` - Format code and then fix linting issues
- `npm run check` - Run both formatting check and linting (used in CI)

### Editor Setup

For the best development experience, install the following VS Code extensions:

- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

The project includes VS Code settings that will automatically format code on save and run ESLint fixes.

### Code Style Rules

- Use single quotes for strings
- No semicolons at the end of statements
- 2 spaces for indentation
- Maximum line length of 100 characters
- Trailing commas in ES5 style (objects, arrays)
- Arrow functions without parentheses for single parameters

## Testing

Run tests with: `npm test`

## Building

Build the TypeScript code with: `npm run build`

## Before Submitting a PR

1. Make sure your code is properly formatted: `npm run format`
2. Ensure no linting errors: `npm run lint`
3. Run tests: `npm test`
4. Build successfully: `npm run build`

Or run everything at once: `npm run format:lint && npm test && npm run build`

## Git Hooks

Consider setting up a pre-commit hook to automatically run formatting and linting:

```bash
#!/bin/sh
npm run format:lint
```
