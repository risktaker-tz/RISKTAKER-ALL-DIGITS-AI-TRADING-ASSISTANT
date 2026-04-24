# TUCHATI

TUCHATI is a multimedia-first social application built with Next.js App Router, TailwindCSS, Prisma, Socket.IO, WebRTC-ready chat flows, and PWA support. It supports images, videos, and audio across feed, statuses, and private messaging.

## Core product logic

- Registration uses private phone numbers in international format with OTP verification.
- Users unlock the `TUCHATI` button only after a mutual follow exists.
- TUCHATI enables private real-time chat, voice/video calling, and optional SMS fallback for offline delivery.
- Feed, status, and chat all support image, video, and audio content.

## Stack

- Frontend: Next.js App Router, TailwindCSS, Zustand
- Backend: Next.js route handlers, Socket.IO server example
- Database: PostgreSQL with Prisma
- Media: S3-compatible signed uploads
- Realtime: WebSockets
- Calls: WebRTC signaling skeleton
- PWA: manifest + service worker
- i18n: locale routing and JSON dictionaries

## Project structure

```text
app/
  [locale]/
    signup/
    feed/
    discover/
    messages/
    profile/
  api/
    auth/
    feed/
    follows/
    messages/
    statuses/
    tuchati/
    upload/
components/
  auth/
  chat/
  common/
  feed/
  layout/
lib/
  i18n/
  sms/
  store/
prisma/
server/
public/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Generate Prisma client and apply schema:

```bash
npm run db:generate
npm run db:push
```

4. Start the app:

```bash
npm run dev
```

5. Start the socket server in a second terminal:

```bash
npm run socket
```

## Vercel deployment

1. Create a PostgreSQL database and object storage bucket.
2. Add every key from `.env.example` to Vercel project settings.
3. Set `NEXT_PUBLIC_APP_URL` to the production domain.
4. Deploy the Next.js app to Vercel.
5. Deploy the Socket.IO server separately if you keep persistent websocket connections outside serverless functions.
6. Point your SMS provider webhook or relay layer to your backend domain if you implement provider callbacks.

## Production notes

- Replace the demo OTP return value with a real OTP provider.
- Replace the placeholder phone hashing with actual encryption at rest.
- Use HLS/DASH transcoding for video and waveform/preview generation for audio.
- Add content moderation and abuse reporting before launch.
- Move rate limiting to Redis or another shared store for multi-instance deployments.
