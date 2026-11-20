# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the TypeScript extension code. `content.tsx` renders the React sidebar and coordinates saves; `bridge.ts` connects to the Excalidraw editor; `worker.ts` handles file operations and runtime messages. `core.ts` validates paths and scenes, `db.ts` stores browser data, `session.ts` tracks active drawings, and `canvas-dialog.ts` implements modal choices. `setup.ts` handles folder connection.

`public/` contains the Manifest V3 manifest and setup HTML. `tests/` contains automated tests. `build.mjs` bundles extension entry points into `dist/`. Generated `dist/`, ZIP archives, and `node_modules/` are ignored by Git.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run typecheck`: check source with strict TypeScript settings without emitting files.
- `npm test`: run the Vitest suite once.
- `npm run build`: bundle scripts with esbuild and copy public assets into `dist/`.

For local development, load `dist/` through **Load unpacked** in `brave://extensions` with Developer mode enabled. Rebuild, reload the extension, and refresh Excalidraw after changes. There is no development server or watch script.

## Coding Style & Naming Conventions

Use TypeScript, ES module imports, and React function components. Match existing compact formatting; expanded blocks generally use two-space indentation. Use camelCase for functions and variables, PascalCase for types and components, and lowercase or hyphenated module names. No formatter or linter is configured; avoid unrelated formatting changes.

Keep editor interaction in the bridge and filesystem operations in the worker. Bump the extension version for every change, including documentation changes. Increment the patch version by default, keep `package.json` and `public/manifest.json` aligned, and rebuild so `dist/manifest.json` reflects the new version.

## Testing Guidelines

Use Vitest with `tests/<module>.test.ts`; browser-dependent tests use the jsdom environment. No coverage threshold is configured. Add regression tests for meaningful changes to saving, recovery, path validation, or conflict handling. Run type checking, tests, and the build before submitting.

Manually verify browser integration using disposable drawings: autosave, switching files, embedded images, external disk edits, recovery, trash restoration, and multiple-tab write blocking. See `README.md` for the full smoke test.

## Commit & Pull Request Guidelines

Existing commits use imperative, descriptive subjects, such as “Preserve drawing settings and restore file sessions with save dialog buttons.” Follow that style.

Pull requests should explain the problem, resulting behavior, and validation performed. Link relevant issues and include screenshots for sidebar or dialog changes. Identify any remaining browser verification, particularly where drawing data could be affected.
