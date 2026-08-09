---
name: brainstorming
description: Frame intent, scope, constraints, risks, approaches, and validation before implementation. Use as the first skill for every non-trivial VietRide feature, bug fix, refactor, UI change, BE contract change, security change, or cross-repository task.
---

# Brainstorming

Run this skill before selecting implementation skills or editing code.

## First pass

1. Inspect the current request, relevant source, git state, and affected repository boundaries.
2. State the desired user-visible outcome and explicit non-goals.
3. Identify constraints that can change the implementation: current BE authority, security/privacy, performance, compatibility, user-owned changes, and runtime/device evidence.
4. Consider alternatives only when they create a meaningful tradeoff. Choose the smallest safe approach when one option is clearly superior.
5. Produce a concise execution brief containing:
   - scope and affected repositories;
   - assumptions and decisions;
   - implementation direction;
   - validation gates;
   - expected `BE-GAPS.md` impact.
6. Continue autonomously when the brief is unambiguous and in scope. Ask the user only when a missing choice would materially change the outcome or authorize a broader/destructive action.

## Scale the pass

- For a small bug, keep the pass internal and brief.
- For a feature or UI change, share the scope and design direction before implementation.
- For cross-repository, security-sensitive, destructive, or production work, share the current evidence and intended boundaries before mutation.

Do not create a brainstorming document unless the user requests one. Do not produce secondary-agent handoff artifacts. Pass the execution brief directly to the next selected skill.
