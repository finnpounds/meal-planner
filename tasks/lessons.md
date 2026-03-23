# Lessons Learned

## Project: AI Meal Planner

_Updated as corrections or validations occur during development._

### L001 — create-next-app rejects directories with capital letters
- Directory name "meal-planner-testsV2" contains a capital V, which violates npm naming restrictions.
- Workaround: scaffold in a temp dir, then copy config files over. Set package name manually.
