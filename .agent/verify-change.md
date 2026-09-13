# Verify a learning step

Reusable agent workflow; invoked after each completed learning slice.

1. Read LEARNING_PLAN.md to identify the authorized slice.
2. Inspect the changed files and confirm contract/ownership implications.
3. Run `npm run check` (TypeScript plus both builds).
4. For scaffold changes, run `npm run smoke` to check process startup and HTTP.
   This checks no authentication or persistence guarantees.
5. Once feature tests exist, run the relevant behavioral tests as well.
6. Record commands, actual results and limitations in AI_WORKFLOW.md.
7. Summarize what the learner should inspect or try. Stop at the agreed
   exercise boundary; do not complete the learner's next exercise automatically.
