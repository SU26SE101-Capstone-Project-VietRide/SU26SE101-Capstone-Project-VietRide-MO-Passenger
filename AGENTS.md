# VietRide Passenger Codex rules

- Follow [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md) for implementation work in this repository.
- Invoke the repo-local `brainstorming` skill first for every non-trivial task. Complete its execution brief before selecting implementation skills or editing code.
- Use `vercel-react-native-skills` as the default skill for React Native and Expo code. Read its `SKILL.md` and only the relevant rule files before editing.
- Work from the current user request, current source code and current git state. Codex operates directly without secondary-agent handoff or review artifacts.
- Treat the current VietRide BE source as authoritative for API, Socket.IO, identity, fare, route, booking and ETA behavior.
- Record confirmed backend-owned contract or runtime defects in the root [`BE-GAPS.md`](BE-GAPS.md). Do not hide them behind Mobile workarounds.
- Preserve unrelated and untracked user work. Do not commit, push, reset or rewrite history unless the user explicitly asks.
- Report changed files, validation actually run, failures and remaining runtime/device verification directly to the user at the end of the task.
