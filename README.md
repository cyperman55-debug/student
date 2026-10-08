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

The Cloudflare Worker deployment serves the static frontend; it does not run the Express API. The API is deployed at `https://student-puce-one.vercel.app`. The `workers.dev` site and custom domains automatically use it; localhost and Vercel-hosted frontend deployments use their same-origin API. Other deployments can override the API base URL with the `VITE_API_URL` build variable.

1. Add the purchased domain to the Cloudflare account that manages the Worker, and configure the domain's nameservers at its registrar to the nameservers Cloudflare provides.
2. In Cloudflare Workers & Pages, attach the domain (and optionally `www`) to the frontend Worker as custom domains. Do not point the domain to the Vercel API; keep the frontend on Cloudflare.
3. In the Vercel project hosting the API, add these Environment Variables for Production:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `VODAFONE_CASH_NUMBER`
   - `CORS_ORIGIN` set to comma-separated exact frontend origins, for example `https://student.cyperman55.workers.dev,https://eng-mohamedabdeelshafy.com,https://www.eng-mohamedabdeelshafy.com` (no trailing slash).
4. Verify `https://student-puce-one.vercel.app/api/health` returns `{"ok":true,...}`.
5. Redeploy the Cloudflare Worker with this repository's latest build. If the Vercel API or frontend domains change, update `src/App.jsx` or set `VITE_API_URL` to `https://<your-vercel-domain>/api` (no trailing slash) in the Cloudflare build settings. `VITE_API_URL` is embedded into the frontend at build time; adding it only as a runtime Worker variable is not sufficient.

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
