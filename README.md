# EVSmart+ Static Web Dashboard

A lightweight standalone **HTML, CSS, and JavaScript dashboard** for **EVSmart+**.

This version is designed for quick deployment on:

- GitHub Pages
- Vercel
- Netlify
- Firebase Hosting
- Any normal static web server

It connects directly to the same **Firebase Realtime Database** used by the EVSmart+ mobile app, so it does **not** require Flutter web.

## Firebase Data Sources

The dashboard reads live data from:

- `alerts`
- `notifications`

## Main Views

- Hospital Dashboard
- Insurance Dashboard
- Accidents Report

## Features

- Realtime Firebase dashboard feed
- Hospital visibility for severe emergency cases
- Insurance visibility for accident and support logs
- Lightweight static hosting
- Role-based dashboard links
- Hospital responder report popup for submitted ambulance reports

## Latest Update

For feed cards titled **Hospital report submitted**, the Hospital Dashboard now shows a **View Report** button.

When clicked, a popup modal opens and displays the submitted ambulance responder report details:

- Responder Name
- Accident Location
- Patient Count
- Patient Condition
- Severity Level
- ETA / Notes
- Timestamp

## Run Locally

From the repository root:

```powershell
python -m http.server 8088
```

Then open:

```text
http://localhost:8088
```

## Role Links

Hospital dashboard:

```text
index.html?role=hospital
```

Insurance dashboard:

```text
index.html?role=insurance
```

Accidents report:

```text
index.html?role=report
```

## GitHub Pages Deployment

1. Push this repository to GitHub
2. Open `Settings > Pages`
3. Set the source branch and root folder
4. Save and wait for publishing to finish

## Required Files

- `index.html`
- `app.js`
- `styles.css`
- `icon.png`
- `.nojekyll`

## Notes

- The Hospital Dashboard is focused on Level 4 and Level 5 emergency visibility
- The dashboard uses live Firebase data, so database rules must allow the required read access
