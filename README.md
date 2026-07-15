# Temp Mail

Static website for a temporary email service with public pages, premium page, blog section, and admin dashboard.

## Features
- Landing page and service pages
- Blog and contact sections
- Premium page and policy/legal pages
- Admin login and dashboard workflow
- PWA support via the included manifest and service worker

## Project Structure
- `index.html` — main entry page
- `admin-login.html` and `admin-dashboard.html` — admin access pages
- `css/` — stylesheets
- `js/` — frontend JavaScript logic
- `img/` — assets and images

## Run Locally
Open the project directory in a browser, or serve it with a small static server if needed.

Example:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

## Deployment
This repository is configured for GitHub Pages deployment via a GitHub Actions workflow.
