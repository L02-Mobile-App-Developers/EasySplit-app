# Agent Operating Rules

This file is the mandatory operating contract for this project.

## 1. Read Before Work

Before any planning, implementation, or execution work begins, the agent must read this file.

Required behavior:
- treat the repository root `AGENTS.md` as the first project file to read
- if this file changes, re-read it before continuing
- do not start phase 2 or later work based on memory of an older version
- if a task spans multiple repositories, read the `AGENTS.md` in each repository before acting there
- Use backend architecture, database design, and API security best practices whenever implementing a new route or modifying data models

## 2. Human Approval Gates

Do not run unattended from phase 1 to phase 7.

Before any implementation action, present:
- the goal
- the exact phase being executed
- the files expected to change
- the acceptance check for that phase

Wait for explicit approval before:
- editing files
- creating new files
- deleting files
- running commands with side effects
- installing dependencies
- changing configs, constants, prompts, or environment-related values
- making external calls or actions that modify state

Actions that do not require approval:
- reading files
- searching the codebase
- analyzing code
- explaining findings

## 3. Phase Discipline

Break work into small, reviewable phases.

Good phases:
- scaffold structure
- design database schema
- wire one API route
- implement one service logic
- add one unit test suite

Bad phases:
- build the whole app
- finish the full redesign
- implement everything in the spec

Rules:
- stop after each meaningful phase
- do not queue future phases without approval
- do not bundle unrelated work into the current phase
- if scope expands, stop and re-plan

## 4. Acceptance Criteria First

Before phase 1, define concrete success criteria.

Use short, testable checkpoints such as:
- exact API response JSON schema
- database state changes and transaction integrity
- required interactions
- edge cases and HTTP error codes
- performance constraints (e.g., query optimization)
- states that must not change

If the target is visual and the criteria are not concrete enough, stop and ask for clarification.

## 5. UI Work Must Be Validated Visually

For backend tasks, code review is not enough. 

For each approved phase:
- provide curl commands or a runnable test script.
- run database queries to verify data integrity.
- summarize how edge cases (like concurrency or bad inputs) are handled.

Do not continue to the next phase until the API endpoint returns the exact expected JSON and status code."

## 6. Do Not Invent Through Ambiguity

If an API contract, database relationship, edge case handling, or business logic rule is unclear:
- ask, or
- present options and wait

Do not silently invent missing requirements for high-visibility behavior.

## 7. Protect Existing Behavior

Do not change existing behavior-defining values without permission.

Examples:
- config values
- constants
- thresholds
- default parameters
- prompts
- environment settings
- user-facing copy that changes behavior

If a fix likely requires one of these changes, call it out explicitly before editing.

## 8. Minimize Scope

Use the smallest effective change.

Expectations:
- touch the fewest files necessary
- avoid unrelated refactors
- preserve the current architecture unless a broader change is approved
- avoid new abstractions unless they materially improve correctness or maintainability

## 9. Verify Every Phase

After each phase, report:
- what changed
- which files changed
- what was verified
- what was not verified
- what assumptions remain
- what should be reviewed next

Prefer verification through:
- dev server checks
- targeted tests
- direct reproduction of the user flow
- API response validation (e.g., via Postman/cURL) and Database state verification

## 10. Record Repeated Mistakes

When a mismatch, bug, or workflow failure reveals a pattern:
- add a regression test when practical
- add or update a written guardrail
- log the lesson in `docs/` when it will prevent repeat mistakes

## 11. Subagent Use

Subagents are optional, not default.

Use the main agent directly when:
- the answer is needed immediately for the next decision
- the material is central to the implementation
- nuance matters and the main agent must form its own judgment
- misinterpretation would likely cause rework

Use a subagent when:
- the research space is large or noisy
- the question is broad but compressible into a concise summary
- the task is exploratory, retrieval-heavy, or filtering-heavy
- the task can be framed as a precise, bounded question
- the main agent can continue useful work in parallel

Keep the main agent responsible for the immediate next decision and final integration.

## 11a. GitHub Commit Tasks

For tasks related to committing code to GitHub, do not require a plan unless the user explicitly asks for one.

## 12. Default Workflow

Use this sequence unless the user explicitly asks for something else:

1. Read `AGENTS.md`.
2. Read the relevant code and references.
3. Define acceptance criteria for the current phase.
4. Present the smallest next phase and wait for approval.
5. Implement only that phase.
6. Verify with the right mechanism, especially the dev server for UI work.
7. Report the delta and stop for review. 
