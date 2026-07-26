# Questionnaire Insights Admin

Independent static administrator dashboard for the questionnaire study.

CloudBase deployment settings:

- Target directory: `./admin-dashboard`
- Framework: Other / static
- Install command: leave blank
- Build command: leave blank
- Build output directory: `./`
- Deployment path: `/`

Required environment variables on the `questionnaireapi` HTTP cloud function:

- `ADMIN_PASSWORD`: a long unique administrator password
- `ADMIN_SESSION_SECRET`: a random secret of at least 32 characters
- `ADMIN_ORIGIN`: the final admin website origin, such as `https://example.webapp.tcloudbase.com`

After changing the cloud-function code or environment variables, publish a new function version.
