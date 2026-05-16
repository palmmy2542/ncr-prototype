# NCR System — Deployment Guide

## Prerequisites

- Node.js 20+
- Firebase project created
- Google Cloud SDK (`gcloud`) installed
- Firebase CLI installed: `npm install -g firebase-tools`

---

## 1. Firebase Setup

### Create Firestore database
1. Go to Firebase Console → Firestore Database → Create database
2. Choose **Native mode**, pick your region

### Get service account credentials
1. Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → download JSON
3. Extract these values for your `.env.local`:
   - `FIREBASE_PROJECT_ID` = `project_id`
   - `FIREBASE_CLIENT_EMAIL` = `client_email`
   - `FIREBASE_PRIVATE_KEY` = `private_key` (keep the `\n` literals)

### Deploy Firestore security rules
```bash
firebase deploy --only firestore:rules
```

---

## 2. Local Development

```bash
# Copy env template
cp .env.local.example .env.local
# Fill in your Firebase credentials + generate a NEXTAUTH_SECRET:
#   openssl rand -base64 32

# Install dependencies
npm install

# Seed test users (run once)
npx ts-node --project tsconfig.json scripts/seed.ts

# Start dev server
npm run dev
```

Visit http://localhost:3000

Test accounts (password: `password123`):
- alice@company.com — Foreman
- bob@company.com — Foreman Head
- carol@company.com — PM
- david@company.com — AMD
- admin@company.com — Admin

---

## 3. Deploy to Cloud Run

### Build and push Docker image
```bash
PROJECT_ID=your-gcp-project-id
IMAGE=gcr.io/$PROJECT_ID/ncr-system

# Build
docker build -t $IMAGE .

# Push
docker push $IMAGE
```

### Deploy to Cloud Run
```bash
gcloud run deploy ncr-system \
  --image $IMAGE \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NEXTAUTH_URL=https://YOUR_DOMAIN,NEXTAUTH_SECRET=YOUR_SECRET,FIREBASE_PROJECT_ID=YOUR_PROJECT_ID,FIREBASE_CLIENT_EMAIL=YOUR_EMAIL" \
  --set-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
```

> Store `FIREBASE_PRIVATE_KEY` in Google Secret Manager to avoid newline escaping issues.

### Set minimum instances (avoid cold starts)
```bash
gcloud run services update ncr-system \
  --min-instances 1 \
  --region us-central1
```

---

## 4. Firebase Hosting

```bash
# Initialize hosting (one time)
firebase init hosting

# Deploy hosting config
firebase deploy --only hosting
```

Your app is live at `https://YOUR_PROJECT_ID.web.app`

---

## 5. Firestore Indexes

Create these composite indexes in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|---|---|---|
| `ncrs` | `participantIds` (Array) + `createdAt` (Desc) | needed for history query |

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Full URL of your app (e.g. https://ncr.company.com) |
| `NEXTAUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (with `\n` newlines) |
