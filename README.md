# Shefo

React/Vite educational platform with an Express API and MongoDB persistence.

## Local development

1. Copy `.env.example` to `.env`.
2. Fill in `MONGODB_URI` and `JWT_SECRET`.
3. Install dependencies:

```bash
npm install
```

4. Start the frontend and backend:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` to the backend on port `5001`.

## Split deployment: Cloudflare frontend and Vercel API

The Cloudflare Worker deployment serves the static frontend; it does not run the Express API. The API is deployed at `https://student-puce-one.vercel.app`, and the published Cloudflare site automatically uses it. Other deployments can override the API base URL with the `VITE_API_URL` build variable.

1. Import this repository into Vercel and deploy it with the included `vercel.json`.
2. Add these Vercel Environment Variables for Production:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `VODAFONE_CASH_NUMBER`
   - `CORS_ORIGIN` set to the exact Cloudflare site origin, for example `https://student.cyperman55.workers.dev` (no trailing slash).
3. After deployment, verify `https://<your-vercel-domain>/api/health` returns `{"ok":true,...}`.
4. If the Vercel domain or Cloudflare domain changes, update the frontend API URL in `src/App.jsx` or set `VITE_API_URL` to `https://<your-vercel-domain>/api` (no trailing slash) in Cloudflare's build settings, then redeploy the Worker. `VITE_API_URL` is embedded into the frontend at build time; adding it only as a runtime Worker variable is not sufficient.

Never put `MONGODB_URI` or `JWT_SECRET` in Cloudflare frontend variables or any `VITE_*` variable. Only the public API base URL belongs in `VITE_API_URL`.

## Vercel deployment

Import the GitHub repository into Vercel. Vercel detects `vercel.json`, builds the Vite frontend, and serves the Express API through `api/index.js`.

Add these Environment Variables in Vercel before deploying:

- `MONGODB_URI`
- `JWT_SECRET`
- `VODAFONE_CASH_NUMBER`

Never commit `.env` or Atlas credential files. Use `.env.example` as the public template.

## GitHub upload

```bash
git init
git add .
git commit -m "Prepare Shefo for Vercel deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
