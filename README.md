# Shefo

React/Vite educational platform with an Express API and MongoDB persistence.

## Local development

1. Copy `.env.example` to `.env`.
2. Fill in `MONGODB_URI` and `JWT_SECRET`. `MONGODB_DNS_SERVERS` is optional; the local API uses it to retry MongoDB SRV lookups if the system DNS resolver returns `EBADRESP`.
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
- Optionally, `ADMIN_NAME`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` together to seed or update the initial admin account. Keep the password in Vercel Environment Variables; never commit it.

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

## Student progress and recharge status

- Playback progress is saved in this browser's local storage per student and exact video URL. It is not synced between devices. Completed videos restart from the beginning. Changing a video's source invalidates its old resume point.
- Bunny iframe players and direct MP4/WebM/Ogg files support automatic resume. Other embeds keep working but show a note that automatic resume is unavailable. The Bunny integration uses the player.js postMessage protocol with both origin and source-window checks, without loading a third-party script. Reference: https://bunny.net/docs/stream/player/javascript
- Students can open recharge history from their home, unit or lesson page. Status refreshes every 60 seconds while visible, on return to the tab, and manually. Approved requests show the actual credited amount; rejected requests show the admin's reason. Notices appear inside the site, not as push notifications.
- The student history endpoint reads the student's requests and balance from Mongo on each request and returns `private, no-store`; it does not expose other students' requests.

### Isolated regression tests

Run `npm ci`, `npx playwright install chromium`, `npm test`, `npm run test:e2e`, and `npm run build`.

The API tests use a fresh in-memory app with synthetic users, no Mongo URI, and an ephemeral local port. Browser tests intercept API and third-party requests, use local fixtures, exercise Bunny message handling and a simulated native-media timeline, and inspect 360px and desktop layouts. Screenshots go to `test-results` (override with `SCREENSHOT_DIR`). They do not log into production, move real money, or play a real paid Bunny stream. Real Mongo persistence across serverless instances and a domain-authorized Bunny stream still need a post-approval deployment smoke test.
