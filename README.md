# Weekly demo

Every Friday, a GitHub Actions workflow builds a visual demo of what changed in
[FestivAR](https://github.com/SwEnt-FestivAR/FestivAR) this week and publishes it to GitHub Pages:
new screens, modified screens (before/after slider), every state and variant (light, dark,
font ×1.5, tablet), the merged PRs, and a **demo mode** (floating phone, arrows ← →, a hand that
taps the button leading to the next state).

**FestivAR is only read, never modified.** The workflow clones it into a temporary folder, copies
a capture test into that clone, runs it, and throws the clone away. Nothing is committed or pushed
to FestivAR.

