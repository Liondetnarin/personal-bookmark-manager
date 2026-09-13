# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
User-confirmed: React/Vite/TypeScript, React Router >=8, MUI >=9,
NestJS/TypeScript and Prisma/SQLite; own Auth0 tenant.

## Users
The developer learns full-stack engineering and builds a personal portfolio
project. The product user saves private links and groups them into Collections.

## Product Purpose
Keep personal bookmarks organised and demonstrate verifiable ownership boundaries.

## Operating Context
The first iteration runs locally. One to two days is a learning target that can
extend without expanding scope. Implementation proceeds in small teaching slices.

## Capabilities and Constraints
Two eventual product pages: Collections and Bookmarks. No public/shared data.
Deleting a Collection preserves its Bookmarks without a group. Duplicate URLs
are allowed; Collection names are unique per owner. See DECISIONS.md.

## Evidence on Hand
Confirmed specs and decision records. No real customer data or production claims.
Step 1 contains only a temporary setup screen; product visual design is deferred.

## Product Principles
Preserve privacy, keep records honest, and make behavior understandable and testable.
