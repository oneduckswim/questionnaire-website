# Questionnaire Website
Online 2 x 2 between-subjects experiment for the thesis study on consumer
responses to AI-assisted product descriptions.

## Conditions

- `laptop_ai`
- `laptop_no_ai`
- `beverage_ai`
- `beverage_no_ai`

Assignment uses balanced randomization. The anonymous response ID is stored in
the participant's browser so refreshes and backward navigation preserve the
assigned condition.

## Research modes

- Main collection: `/`
- Pilot collection: `/?mode=pilot`
- Forced pilot previews:
  - `/?mode=pilot&condition=laptop_ai`
  - `/?mode=pilot&condition=laptop_no_ai`
  - `/?mode=pilot&condition=beverage_ai`
  - `/?mode=pilot&condition=beverage_no_ai`

Forced conditions are honored only in pilot mode.

## Data

Responses are stored in D1. Set the hosted `ADMIN_EXPORT_KEY` secret, then
download CSV data from `/api/export?key=YOUR_KEY`.

The export includes the anonymous ID, assigned condition, experimental factors,
pilot flag, timing and completion fields, attention/manipulation-check flags,
and all questionnaire responses.

## Local development

Install dependencies and run the development server:

```text
pnpm install
pnpm dev
```

Build with:

```text
pnpm build
```
