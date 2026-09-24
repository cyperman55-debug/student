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

The frontend runs on `http://localhost:5173` and proxies `/api` to the backend on port `5000`.

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
