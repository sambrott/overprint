# Connect this folder → GitHub + push

**Repo:** [github.com/sambrott/overprint](https://github.com/sambrott/overprint)  
**User:** `sambrott`

Your project folder may already have `origin` set to this URL. Confirm and push from **Terminal** (the agent often cannot write `.git/`).

## 1. Go to the project

```bash
cd "/Users/SamBro/Desktop/ALL FILES/GitHub/School/overprint"
```

## 2. Set `origin` (HTTPS or SSH)

```bash
git remote -v
git remote set-url origin https://github.com/sambrott/overprint.git
git remote -v
```

SSH:

```bash
git remote set-url origin git@github.com:sambrott/overprint.git
```

## 3. Commit and push

```bash
git status
git add -A
git commit -m "Update Overprint site"   # skip if nothing to commit
git branch -M main
git push -u origin main
```

If push is rejected, try `git pull origin main --rebase` then push again (or resolve as in git’s message).

## 4. Vercel root directory

- If GitHub shows **`public/`** at the **repo root** → set Vercel **Root Directory** to **`public`**.
- If GitHub shows **`overprint/public/`** (nested folder) → set **Root Directory** to **`overprint/public`**.

Framework: **Other**, no build command, output **`.`** when root is already `public`.

---

**Cursor** edits files here; **you** run `git push` when ready.
