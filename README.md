# Shala Sangathi - Backend

REST API for the Shala Sangathi app (GSEB, Gujarati medium, Std 1–10).
Node + Express 5 + TypeScript + Prisma 7 (PostgreSQL). The layout follows the CostAllocationPro backend:

```
index.ts            Express app: security headers, CORS, routes, startup
config.ts           All environment variables in one object
prisma/             schema.prisma, migrations, seed.ts
app/
  routes/           One router per feature; routes/index.ts mounts them, admin/ holds the admin panel API
  controllers/      Validate → call a service → DefaultResponse (admin/ for the admin panel)
  services/         Business rules (weekly test window, grading, paid access, AI generation...)
  repositories/     Prisma queries only
  middlewares/      isAuthenticated, isStaff / isAdmin
  helpers/          Responses, errors, validators, tokens, dates, grades
  interfaces/       Request / input types
  models/           CustomError
  client/           Prisma and Anthropic clients
  generated/prisma  Generated Prisma client (git-ignored, `npm run prisma:generate`)
```

## Run locally

```bash
cp .env.example .env          # then set real JWT secrets
docker compose up -d          # PostgreSQL on localhost:5433
npm install
npm run prisma:migrate        # create tables
npm run db:seed               # standards, subjects, Std 5 sample content, demo users
npm run dev                   # http://localhost:8080/api/v1
```

Demo logins created by the seed (passwords come from `SEED_*` in `.env`):

| Login      | Role                                   |
| ---------- | -------------------------------------- |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_MOBILE` (or `admin`) | Super admin - sees only the admin panel |
| `abhishek` | Std 5 student (other school - paid tests are locked) |
| `riya`     | Std 3 student, same mobile as abhishek (our school - free access) |

## How the requirements map to the API

| Requirement | Where |
| --- | --- |
| Username + password login, mobile optional, many children per mobile | `POST /auth/register`, `POST /auth/login` - `mobile` is optional and not unique |
| Student sees only their standard's subjects | `GET /subjects` (filtered by the student's `standardId`) |
| Weekly test per subject, next week's test appears automatically | Tests have `weekStart`/`weekEnd` (Monday 00:00 IST). `GET /tests` returns tests live in the current week |
| Separate result per subject, timer enforced | `POST /tests/:id/start` → `POST /tests/:id/submit`; one attempt per student per test |
| Progress card, weekly, kept forever, graph | `GET /progress/summary`, `GET /progress/card?weeks=12` (`trend` is the graph series) |
| Manual + AI questions, AI shown only after approval | `POST /admin/questions` (approved), `POST /admin/questions/generate` (PENDING), `POST /admin/questions/review` |
| Free for own school, free + paid for others (₹10/month) | `isSchoolStudent` (set by `SCHOOL_ACCESS_CODE` at register or by admin), `Test.isPaid`, `Subscription` |
| Ads: banner, one interstitial per day, none during tests | `GET /ads`; frequency and placement are handled in the app |
| Admin panel (inside the app, 2-3 super admins) | Everything under `/api/v1/admin/*`. Staff log in with email or mobile (`POST /auth/login` accepts username, email or a staff mobile) |
| ₹10/month online purchase | `POST /subscription/checkout` (Razorpay Payment Link) → `GET /subscription/payments/:id` (checks Razorpay) + `POST /payments/razorpay/webhook` (signed) |

## Notes

- **AI questions** use Claude (`claude-opus-5-5`) with structured JSON output, then `server-side fallback` on safety declines. Set `ANTHROPIC_API_KEY`.
  Generated questions are saved as `PENDING` and never reach students until approved.
- **Payments (Razorpay)**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` (start with Test Mode keys).
  The app opens a Razorpay Payment Link; when the student returns, the API asks Razorpay for the link status, and the webhook
  (`payment_link.paid / expired / cancelled`, URL `/api/v1/payments/razorpay/webhook`) does the same in the background.
  A payment extends the plan exactly once. Without keys, online payment is switched off and admins can still grant plans
  from the student screen in the admin panel (e.g. after cash/UPI at school).
- **Auth**: short-lived access token (1h) + rotating refresh token (30 days) stored per device in `Token`. Logout or password change revokes sessions immediately.
- **Production**: `docker build -t shala-backend .` - the container runs `prisma migrate deploy` and starts the API.
