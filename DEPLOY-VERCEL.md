# Ello AI Tutor — Peak (Vercel build)

This folder is the **static client** of Ello AI, packaged for Vercel. It is deliberately small (~150 KB zipped)
and contains no server code, no `node_modules`, no database and no secrets.

## Deploy in 60 seconds

1. Unzip this folder.
2. In the folder, run:

   ```bash
   npx vercel
   ```

   Press Enter through the prompts (Vercel reads `vercel.json`, so accept the detected settings).
   For the public URL, run `npx vercel --prod`.

Or, without the CLI: drag the unzipped folder onto <https://vercel.com/new> (Vercel imports the folder as a
project), keep **Framework preset: Vite**, **Build command: `npm run build`**, **Output directory: `dist`**.

## What Vercel runs

| Setting | Value |
| --- | --- |
| Install | `npm install` |
| Build | `npm run build` (Vite, root `web/`, output `dist/`) |
| Output | `dist` |
| Node | 24.x (pinned in `package.json` → `engines.node`) |

`vercel.json` already sets all of this plus an SPA fallback rewrite, so no dashboard configuration is needed.

## What works on Vercel

Fully static, no backend required:

- Sign up / sign in with Firebase, with the local-storage fallback when Firebase is unreachable
- Live board workspace, flashcards, chat, PDF upload listing, progress and results
- The ten-question mock exam and the six reading voices

These need the Express API from the full-stack archive (they fall back to built-in behaviour instead of erroring):

- Gemini-generated boards, document parsing and exam generation from an uploaded PDF

## Notes

- The build is a single-page app; `/assets/*` is cached immutably and every other path serves `index.html`.
- Firebase web config lives in `web/src/lib/firebase.ts` (public client keys are safe to ship).
- The Gemini API key is **not** in this package and must never be put in the client. If you later add AI on
  Vercel, call it from a Vercel Function with a server-side environment variable.
