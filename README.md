# EVSmart+ Static Web Dashboard

This folder is a standalone HTML/CSS/JS dashboard for GitHub Pages, Vercel,
Netlify, Firebase Hosting, or any static web server.

It does not use Flutter web. It connects directly to the same Firebase Realtime
Database used by the mobile app:

- `alerts`
- `notifications`

## Open Locally

Use any static server from this folder:

```powershell
cd static_dashboard
python -m http.server 8088
```

Open:

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

## GitHub Pages

1. Create a new GitHub repository for the dashboard.
2. Upload the files inside `static_dashboard`.
3. Go to repository `Settings` -> `Pages`.
4. Set source to the main branch and root folder.
5. Open the generated GitHub Pages link.

## Firebase Rules Note

This dashboard can read/write only if Firebase Realtime Database rules allow the
hosted page to access `alerts` and `notifications`. For a demo, permissive rules
may work. For a real system, add authentication and role-based rules.
