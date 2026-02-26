# Perfboard Designer
[![Deploy to GitHub Pages](https://github.com/Salnika/perfboard-designer/actions/workflows/deploy.yml/badge.svg)](https://github.com/Salnika/perfboard-designer/actions/workflows/deploy.yml)

Interactive web app to design prototype perfboard layouts with components, nets, traces, and labels.

## Demo
- GitHub Pages: https://salnika.github.io/perfboard-designer/

## Features
- Board editor with configurable size and labeling mode.
- Tool palette for selection, routing, fixed points, net labels, and erase.
- Component placement (resistor, switch, diode, capacitor families, transistor, potentiometer, jack, power symbols, DIP IC).
- Net management in inspector (names, terminals, per-net cable color).
- JSON import/export (`.perfboard.json`) and visual export (`.svg`, `.png`).
- Undo/redo and keyboard shortcuts for fast editing.
- Optional auto-layout workflow (`VITE_FEATURE_AUTO_LAYOUT=false` to hide).

## Tech Stack
- React 19
- TypeScript (strict mode)
- Vite 7
- vanilla-extract
- Vitest + Testing Library
- oxlint

## Requirements
- Bun `1.3.8` (repository is Bun-first).

## Getting Started
```bash
bun install
bun run dev
```

Vite serves the app on `http://localhost:5173` by default.

## Scripts
| Command | Description |
| --- | --- |
| `bun run dev` | Start local dev server. |
| `bun run build` | Type-check and build production assets. |
| `bun run preview` | Serve the production build locally. |
| `bun run lint` | Run static analysis with oxlint. |
| `bun run test` | Run test suite once. |
| `bun run test:watch` | Run tests in watch mode. |
| `bun run test:coverage` | Run tests with coverage report. |

## Quality Gate
Before opening a PR:
```bash
bun run lint
bun run test
bun run build
```

## Project Structure
- `src/model`: core domain model, serialization, autorouting/autolayout logic.
- `src/features/board`: board rendering and interactions.
- `src/features/export`: JSON/SVG/PNG export utilities.
- `src/app`: state store, UI shell, keyboard shortcuts, and app-level components.
- `src/test`: test setup and shared fixtures.

## Deployment
GitHub Pages deployment is automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
- Triggered on push to `master`.
- Can be triggered manually from GitHub Actions (`workflow_dispatch`).
- Runs install, tests, and build before deploying `dist/`.

## Contributing
Issues and pull requests are welcome. Until a dedicated `CONTRIBUTING.md` is added, please follow the quality gate above and keep business logic covered by tests.

## License
MIT - see [LICENSE](LICENSE).
