# Landing AI Studio - Licenta

Initial implementation scaffold for:

- Landing page builder with templates and A/B variants
- Alibaba link based image import
- Pattern-based AI image generation flow

## Project structure

- `frontend/` - React + Vite + Tailwind
- `backend/` - Express + TypeScript

## Run locally

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### Free AI image mode (recommended for license demo)

Backend uses local Stable Diffusion API.

1. Start Stable Diffusion WebUI with API enabled (example):

```bash
webui-user.bat --api
```

2. Keep default API URL `http://127.0.0.1:7860` or adjust in `backend/.env`.

3. Generate image variants from Image Studio. No OpenAI billing needed.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Current endpoints (MVP placeholders)

- `GET /api/health`
- `GET /api/landings/templates`
- `GET /api/images/patterns`
- `POST /api/images/import-alibaba`
- `POST /api/images/generate`

## Next implementation steps

1. Replace placeholder Alibaba import with robust scraper/parser and legal safeguards.
2. Integrate real image generation provider in `/api/images/generate`.
3. Persist templates, image assets, and variants in PostgreSQL.
4. Connect Landing Builder UI with backend APIs.
5. Add Shopify OAuth and product sync.
