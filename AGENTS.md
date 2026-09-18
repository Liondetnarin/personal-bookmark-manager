# Project working rules

## Read before changing behavior
Read CONTEXT.md (domain terms), DECISIONS.md (confirmed decisions),
API_DESIGN.md (contract), and LEARNING_PLAN.md (current learning stage).
The rewritten docs are the project spec. Do not use or publish the source PDF.

## Learning boundary
Step 1 scaffolding is complete. The developer reported successful browser login on 2026-09-15.
Step 3 Collections CRUD and its review are committed as eef2562. Ownership, uniqueness and scoped totals were discussed with the developer.
Step 4 title and URL validators were implemented with explanations at the developer's request. Next is POST body validation; continue in small learning slices using docs/bookmark-exercise.md.
The developer practices Bookmarks; do not implement that exercise on their
behalf without an explicit request. Explain each small change and its evidence.
The user has approved the plan; do not reopen settled choices.

## Stack and commands
Node 24, npm workspaces, TypeScript, NestJS, React/Vite/React Router/MUI.
Prisma/SQLite has User, Collection and Bookmark models. Bookmark relations are implemented in the completed learning slice.
On Windows use npm.cmd if PowerShell blocks npm.ps1.
Run npm run check and npm run smoke for scaffold changes.
Use .agent/verify-change.md as the reusable verification workflow.

## Privacy
Add no business routes until authentication is enforced alongside them.
Owner identity comes from a validated API Access Token, never request body.
All reads, counts, relationships and writes must be scoped to the owner.
Other-owner IDs must behave like absent IDs. Never use external test credentials.
Keep real env values, tokens, passwords and databases out of Git.

## Evidence and scope
Do not call smoke checks auth or privacy tests. Record only actual results.
Keep transcripts exact; label excerpts and summaries honestly. Do not reconstruct
missing chat history or invent AI mistakes. Commit only task-owned files.
Do not modify installed skills or skills-lock.json as part of app work.
No deployment, extra pages, search, sharing, or trash in this learning stage.

## Current completion note (2026-09-18)

The developer explicitly authorized completing the planned Bookmark exercise. Bookmark API, Prisma migration, React workspace, isolated backend tests, and Playwright browser tests are implemented. The next learning step is review and portfolio documentation; no new feature scope is implied.

