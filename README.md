# appgrid.xarbit.dev

Marketing site for [AppGrid](https://github.com/xarbit/plasma6-applet-appgrid), a modern application launcher for KDE Plasma 6.

Stack: Astro · Tailwind v4 · React (islands) · Bun · GitHub Pages.

## Development

Requires [Bun](https://bun.sh) `>= 1.3`.

```bash
bun install        # install deps
bun dev            # http://localhost:4321
bun run build      # build to ./dist
bun run preview    # preview the build
```

## Project structure

```
src/
├── assets/screenshots/   # PNG sources (Astro Image pipeline → optimized WebP)
├── components/
│   ├── Navbar.astro
│   ├── Hero.astro
│   ├── Features.astro
│   ├── GallerySection.astro   # Astro wrapper: builds optimized image URLs
│   ├── Gallery.tsx            # React island: thumbnail grid + lightbox
│   ├── Install.astro
│   ├── InstallTabs.tsx        # React island: tabbed install commands
│   └── Footer.astro
├── layouts/Layout.astro
├── pages/index.astro
└── styles/global.css   # Tailwind + KDE Breeze theme tokens
public/
├── CNAME               # appgrid.xarbit.dev (required for custom domain)
└── favicon.svg
```

## Deploy

GitHub Actions builds on every push to `main` and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

### One-time setup (xarbit/appgrid.xarbit.dev)

1. **Create the repo on GitHub** as `xarbit/appgrid.xarbit.dev` and push:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin git@github.com:xarbit/appgrid.xarbit.dev.git
   git push -u origin main
   ```

2. **Enable Pages** in the repo:
   `Settings → Pages → Build and deployment → Source: GitHub Actions`

3. **DNS at desec.io** — add a `CNAME` record:
   | Field   | Value                  |
   |---------|------------------------|
   | Subname | `appgrid`              |
   | Type    | `CNAME`                |
   | TTL     | `3600`                 |
   | Record  | `xarbit.github.io.`    |

   Trailing dot is mandatory in the desec.io UI.

4. **Verify domain** in GitHub:
   `Settings → Pages → Custom domain → appgrid.xarbit.dev → Save`

   GitHub stores the value in `public/CNAME` (already committed).

5. **Wait for DNS propagation** (~1–15 min). Check:
   ```bash
   dig +short CNAME appgrid.xarbit.dev    # → xarbit.github.io.
   ```

6. **Enable HTTPS**:
   `Settings → Pages → Enforce HTTPS` (check box once GitHub finishes provisioning the Let's Encrypt cert — usually 5–15 min after DNS resolves).

### CAA records (if HTTPS provisioning fails)

If `xarbit.dev` has CAA records, they must allow `letsencrypt.org`:

```bash
dig CAA xarbit.dev
```

No output = no CAA = any CA can issue. If CAA exists, add `0 issue "letsencrypt.org"` at desec.io.

## Migrating to Codeberg (or another forge)

Repo links are centralized in [`src/config/repo.ts`](src/config/repo.ts). All components read from it.

**Full migration to Codeberg:**

```ts
// src/config/repo.ts
export const primary: RepoConfig = make(
  "codeberg",
  "xarbit",
  "plasma6-applet-appgrid",
);

export const mirrors: RepoConfig[] = [
  make("github", "xarbit", "plasma6-applet-appgrid"),  // keep as mirror
];
```

That's it. One edit. All links, install commands, star fetcher, footer, and CTA buttons update.

**Star count API** — handled automatically:
- GitHub: `api.github.com/repos/{owner}/{repo}` → `stargazers_count`
- Codeberg: `codeberg.org/api/v1/repos/{owner}/{repo}` → `stars_count`

**Optional auth tokens** for higher rate limits:
- `GITHUB_TOKEN` — auto-provided in GitHub Actions (`secrets.GITHUB_TOKEN`)
- `CODEBERG_TOKEN` — generate in Codeberg → Settings → Applications

Set as repo secrets in GitHub Actions, then in `.github/workflows/deploy.yml`:

```yaml
- name: Build site
  run: bun run build
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CODEBERG_TOKEN: ${{ secrets.CODEBERG_TOKEN }}
```

## License

GPL-2.0-or-later (matches the AppGrid project).
