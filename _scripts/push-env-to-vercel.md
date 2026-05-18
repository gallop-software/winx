# Push Environment Variables to Vercel

Push environment variables from `.env.production` to your Vercel project using the Vercel REST API. Variables are stored as encrypted secrets.

**Tier:** Free  
**File:** `_scripts/push-env-to-vercel.sh`

---

## Prerequisites

- **Vercel CLI** installed globally: `npm i -g vercel`
- **Vercel project linked** (the script will prompt you to link if not already done)
- **Vercel API token** (get one from [vercel.com/account/tokens](https://vercel.com/account/tokens))

## Usage

### Push to production only (default)

```bash
npm run env
```

### Push to production environment

```bash
npm run env:prod
```

### Push to preview environment

```bash
npm run env:prev
```

### Push to multiple environments

```bash
./_scripts/push-env-to-vercel.sh "preview,production"
```

## How It Works

1. Reads variables from `.env.production`
2. Links to your Vercel project (if not already linked)
3. Validates your Vercel token
4. Upserts each variable as an encrypted secret via the Vercel API
5. Saves your token to `.vercel/project.json` for future use

## First Run

On first run, the script will:

1. Prompt you to run `vercel link` to connect to your project
2. Ask for your Vercel API token
3. Validate the token before saving it

## Environment File Format

The script reads from `.env.production`:

```bash
# Comments are ignored
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
MAILGUN_API_KEY=your-api-key-here
```

## Troubleshooting

### "Vercel CLI not found"

Install the Vercel CLI globally:

```bash
npm i -g vercel
```

### "Unauthorized" or "Forbidden"

Your Vercel token is invalid or lacks permissions. Generate a new token at [vercel.com/account/tokens](https://vercel.com/account/tokens).

### "Environment file not found"

Create a `.env.production` file in your project root. You can copy from `.env.production.sample`:

```bash
cp .env.production.sample .env.production
```

Then fill in your real values.
