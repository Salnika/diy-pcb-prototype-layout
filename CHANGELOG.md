# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project currently follows semantic versioning principles for release notes.

## [Unreleased]

### Added

- Expanded README with features, setup, scripts, quality gate, and deployment notes.
- Added this changelog file for release tracking.

### Changed

- Renamed project branding and package identity to `Perfboard Designer`.
- Updated JSON export extension from `.diypcb.json` to `.perfboard.json`.
- Migrated app storage keys to `perfboard-designer.*` with fallback support for legacy keys.
- Standardized package manager metadata on Bun (`packageManager` and Bun engine range).
- Pinned Bun version in GitHub Pages deployment workflow.
- Added manual deployment trigger (`workflow_dispatch`) to the deploy workflow.
