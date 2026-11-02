# AI use declaration (working record)

## Route and tool

Vibe coding route. OpenAI Codex assisted with planning, code generation, refactoring, debugging and verification. AI-generated code is included; this project does not claim the hand-coding bonus. The exact model/version should be copied from the application record before submission rather than guessed.

## Assisted parts

- The initial HTML/CSS/JavaScript interface, interactions and English/Traditional Chinese text.
- Reorganising the existing client into `source/client/`.
- Express routes, SQLite schema, session authentication, validation and image handling in `source/server/` and `source/database/`.
- Replacing localStorage business data with Fetch API calls and connecting forms/dashboard actions.
- API integration tests and local setup/API/testing documentation.
- English README and a Chinese Word implementation handoff for the other group member.

## Verification

Automated API tests use temporary databases and real HTTP requests. Isolated browser checks use two registered accounts to publish, apply, edit, accept, complete handover and manage private/public diaries. Database restart, access control, competing acceptance, responsive layout and browser error checks are included. Details are recorded in `docs/testing.md`.

## Student review before submission

Both members should review and understand the submitted code, reproduce the tests and explain the core application logic. Add the exact tools/versions and any later changes here. Individual contributions and signatures must reflect actual work; this document does not assign authorship or contribution percentages.
