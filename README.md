# Smart Laundry System

A Next.js 14 (App Router) + TypeScript + MongoDB implementation of the
**Common Workflow**, **Module 1** (Availability, Job Feed & Appointment),
and **Module 2** (Rating & Feedback, Favorites, Chat-Box) functional
requirements for CSE471.

---

## 1. Project structure

```
smart-laundry-system/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Landing page
│   │   ├── layout.tsx                   # Root layout (fonts, globals)
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── customer/page.tsx
│   │   │   ├── laundry/page.tsx
│   │   │   └── delivery/page.tsx
│   │   ├── chat/page.tsx                # Module 2: Chat-Box UI
│   │   └── api/
│   │       ├── auth/{register,login,logout,me}/route.ts
│   │       ├── laundries/route.ts       # browse/search laundries
│   │       ├── laundry/
│   │       │   ├── availability/route.ts  # Module 1: online/offline
│   │       │   ├── jobfeed/route.ts       # Module 1: job feed
│   │       │   └── appoint/route.ts       # Module 1: appoint delivery-man
│   │       ├── bookings/route.ts & [id]/route.ts  # Common Workflow
│   │       ├── ratings/route.ts         # Module 2: rating & feedback
│   │       ├── favorites/route.ts       # Module 2: favorites
│   │       └── chat/route.ts & [conversationId]/route.ts  # Module 2: chat-box
│   ├── components/                      # Client components (dashboards, chat, navbar)
│   ├── lib/
│   │   ├── dbConnect.ts                 # Mongoose connection
│   │   ├── auth.ts                      # JWT sign/verify, cookie helpers
│   │   └── mailer.ts                    # Gmail API notifications
│   ├── models/                          # Mongoose schemas
│   │   ├── User.ts        # customer / laundry / delivery, one collection
│   │   ├── Booking.ts     # orders (serial no., status, VIP flag)
│   │   ├── Rating.ts
│   │   ├── Conversation.ts
│   │   └── Message.ts
│   └── middleware.ts                    # role-based route protection
├── scripts/seed.ts                      # demo account seeder
├── package.json
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── .env.example
```

### Why this shape?
- **One `User` collection, discriminated by `role`** (`customer` / `laundry` /
  `delivery`) — matches the doc's "Registration and Login System" being one
  shared flow with role-specific fields (e.g. `laundryName`, `isOnline` for
  laundry; `verified`, `assignedLaundryId` for delivery-men).
- **Route groups under `src/app/dashboard/<role>`** so `middleware.ts` can
  block a customer from opening `/dashboard/laundry`, etc.
- **API routes mirror the modules** in your document 1:1, so it's easy to
  point to exactly which endpoint implements which bullet point when you
  write your report.

---

## 2. Local setup

**Requirements:** Node.js 18+, a MongoDB connection (Atlas free tier is fine).

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values (see section 4 for Gmail API)
cp .env.example .env.local

# 3. (optional) seed 3 demo accounts — customer/laundry/delivery@demo.com, password123
npm run seed

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000.

---

## 3. Feature → file map (for your report)

| Requirement (from your doc) | Where it's implemented |
|---|---|
| Registration & Login System | `api/auth/register`, `api/auth/login`, `app/(auth)/*` |
| Laundry manages incoming bookings (approve/cancel/reschedule) | `api/bookings/[id]/route.ts` (`PATCH`), Laundry dashboard "Incoming Bookings" tab |
| **Module 1** — Availability (online/offline) | `api/laundry/availability/route.ts` |
| **Module 1** — Job Feed and Appointment | `api/laundry/jobfeed/route.ts`, `api/laundry/appoint/route.ts`, Laundry dashboard "Job Feed" tab |
| **Module 2** — Rating and Feedback (+ favorites) | `api/ratings/route.ts`, `api/favorites/route.ts` |
| **Module 2** — Chat-Box (incl. group chat) | `api/chat/route.ts`, `api/chat/[conversationId]/route.ts`, `app/chat/page.tsx` |
| Identity generation per order (serial no.) | `Booking.orderSerial`, generated in `api/bookings/route.ts` |
| VIP membership | `User.vipEnabled` / `vipCustomerIds`, Laundry dashboard "Settings" tab (toggle UI is scaffolded; wire it to a new `PATCH /api/laundry/vip` route the same way `availability` works if you need full CRUD) |

Chat uses simple **3-second polling** (`ChatApp.tsx`) rather than
WebSockets — it's dependency-free and works out of the box on Vercel's
serverless functions. If you want true real-time for the final version,
swap the polling `useEffect` for [Pusher](https://pusher.com) or
[Ably](https://ably.com) (both have generous free tiers and a few-line
integration) — say the word and I can wire that in.

---

## 4. Gmail API setup (for booking/notification emails)

`src/lib/mailer.ts` sends mail through Gmail using OAuth2 (via
`googleapis` + `nodemailer`), not a raw app password — this is what your
doc's "External APIs: Gmail API" line refers to.

1. Go to https://console.cloud.google.com/ → create a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type: *Web application* → add
   `https://developers.google.com/oauthplayground` as an authorized redirect URI.
   Copy the **Client ID** and **Client Secret**.
4. Go to https://developers.google.com/oauthplayground →
   click the gear icon (top right) → check **"Use your own OAuth credentials"**
   → paste your Client ID/Secret.
5. In the left panel, find **Gmail API v1** → select scope
   `https://mail.google.com/` → **Authorize APIs** → log in with the Gmail
   account you want to send from → **Exchange authorization code for tokens**.
6. Copy the **Refresh token** shown.
7. Fill these into `.env.local`:
   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   ```

Emails are sent for: welcome on registration, booking created, and every
booking status change. Sending failures are logged but never block the
API response (see the `try/catch` in `mailer.ts`), so a bad Gmail config
won't break booking/registration during a demo.

---

## 5. Deployment (Vercel + MongoDB Atlas)

### 5.1 Database — MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com.
2. **Database Access** → add a user with a password.
3. **Network Access** → add `0.0.0.0/0` (allow from anywhere) so Vercel's
   serverless functions can connect.
4. **Connect → Drivers** → copy the connection string, and fill in your
   user/password/db name — that's your `MONGODB_URI`.

### 5.2 App — Vercel
1. Push this project to a GitHub repo.
2. Go to https://vercel.com → **Add New → Project** → import the repo.
3. Framework preset: Vercel auto-detects **Next.js** — no changes needed.
4. Under **Environment Variables**, add everything from `.env.example`
   with real values:
   `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GMAIL_USER`,
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
   `NEXT_PUBLIC_APP_URL` (set to your final `https://your-app.vercel.app`).
5. Click **Deploy**. Vercel builds and gives you a live URL.
6. (Optional, per your doc's tech stack) If you'd rather deploy to
   **Cloudflare Pages** instead: run `npx @cloudflare/next-on-pages`
   in the repo, connect the repo in the Cloudflare dashboard, set the
   build command to `npx @cloudflare/next-on-pages`, output directory
   `.vercel/output/static`, and add the same environment variables under
   **Settings → Environment variables**. Vercel is the simpler path since
   this is a standard Next.js app with API routes.

### 5.3 Post-deploy checklist
- Visit `/register`, create one account per role, confirm login works.
- As the laundry account, toggle **Online**, then as the customer account
  confirm the laundry shows "Online" in Browse and the **Chat** button
  becomes enabled.
- Create a booking as customer → approve as laundry → appoint a delivery-man
  from **Job Feed** → advance status from the delivery dashboard → rate the
  order as customer once it's `delivered`.

---

## 6. Notes on the Figma prototype

I wasn't able to fetch your Figma link automatically (Figma blocks
automated/bot access to proto links), so the UI here is original —
built from the palette/typography choices in `tailwind.config.ts`
(a "fresh wash" teal + citrus theme) rather than matched to your mockups.
If you export a few key screens as PNGs and share them, I can adjust the
components in `src/components/` to match your prototype's layout, spacing
and colors directly.
#   s m a r t - l a u n d r y - s y s t e m  
 