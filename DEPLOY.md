# Deploying to wackybrains.com

## How it works
- Hosting: **Vercel**
- Repo: `github.com/mohammedrahman1991/GameWorld`
- Production branch: **main**
- Vercel auto-deploys on every push to `main`
- Local branch: `first-push` → always push to `main`

## Standard deploy (after making changes)

```bash
git add <changed-files>
git commit -m "your message"
git push origin first-push:main
```

## If the site doesn't update after push

Vercel may have stalled. Force a redeploy:

```bash
# Option 1 — empty commit to trigger Vercel
git commit --allow-empty -m "trigger redeploy"
git push origin first-push:main

# Option 2 — deploy directly via Vercel CLI
npx vercel deploy --prod
```

## Verify deploy went out

```bash
# Check local vs remote are in sync (no output = in sync)
git log origin/main..HEAD --oneline

# List recent Vercel deployments
npx vercel ls
```

## User-side cache
If the user sees old content after a confirmed deploy, they need a hard refresh:
- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + R`

## File structure
Games live in subfolders and are served at matching URL paths:
- `82-and-0/index.html` → `wackybrains.com/82-and-0/`
- `parkour-game/index.html` → `wackybrains.com/parkour-game/`
- `index.html` (root) → `wackybrains.com/`
