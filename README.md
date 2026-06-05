# Adar Board — Internal Team Updates PWA

## What this is
A shared internal board where anyone on the team can tap an entity (department, client, vendor), drop a note, and everyone sees it in real time. Works on phone and desktop. Installs as an app icon (PWA).

---

## Step 1 — Create a new Supabase project

1. Go to https://supabase.com and sign in
2. Click "New project"
3. Name it "adar-board", pick a region close to you
4. Save the database password somewhere
5. Wait for it to provision (~1 min)

---

## Step 2 — Run the database setup

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Open the file `supabase-setup.sql` from this project
3. Paste the entire contents into the editor
4. Click **Run**
5. You should see "Success" — this creates all the tables, storage bucket, and policies

---

## Step 3 — Get your Supabase keys

1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ`)

---

## Step 4 — Push this project to GitHub

1. Create a new repo on GitHub (name it `adar-board`)
2. In this folder, run:
```
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/adar-board.git
git push -u origin main
```

---

## Step 5 — Deploy to Vercel

1. Go to https://vercel.com and sign in (use your existing account)
2. Click **Add New → Project**
3. Import your `adar-board` GitHub repo
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**
6. Wait ~1 minute — Vercel gives you a URL like `adar-board.vercel.app`

---

## Step 6 — Add PWA icons (optional but recommended)

Create two square PNG images for the app icon:
- `public/icons/icon-192.png` — 192×192px
- `public/icons/icon-512.png` — 512×512px

Use the Adar Global logo or any square image. Tools like https://realfavicongenerator.net can generate these automatically.

---

## Step 7 — Share the link

Send the Vercel URL to your team. On iPhone, tell them:
> "Open the link in Safari → tap the Share button → Add to Home Screen"

On Android it'll prompt automatically.

---

## Customizing entities

The SQL file seeds 4 starter entities (Operations, Sales, Finance, HR). You can:
- Edit them directly in Supabase → Table Editor → entities
- Or use the "+ Add" button in the app itself

---

## Features included
- ✅ Real-time updates (notes appear instantly without refresh)
- ✅ Attachments (photos, PDFs, any file)
- ✅ Name memory (saves to localStorage after first post)
- ✅ PWA — installs as home screen app
- ✅ Works on iPhone, Android, desktop
- ✅ Dark mode design
- ✅ Add entities on the fly
