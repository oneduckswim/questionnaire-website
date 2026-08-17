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

For the mainland deployment, responses are stored in an EdgeOne Pages KV
namespace. Set the hosted `ADMIN_EXPORT_KEY` environment variable, then
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

## Mainland China deployment (Tencent EdgeOne Pages)

1. Import this GitHub repository in EdgeOne Pages.
2. Use framework preset `Next.js`, build command `npm run build`, and output
   directory `out`.
3. In **Storage > KV**, create a namespace and bind it with the exact variable
   name `questionnaire_kv`.
4. Add an encrypted environment variable named `ADMIN_EXPORT_KEY`.
5. Redeploy after the binding and variable are saved.

The project includes EdgeOne Pages Functions at:

- `/api/session` for fixed four-condition assignment and anonymous IDs
- `/api/response` for response recording
- `/api/export` for protected CSV export

The Tencent default Pages domain can be used for pilot testing. For a
participant-facing custom domain served from mainland China acceleration
nodes, complete Tencent real-name verification and the required ICP filing.
