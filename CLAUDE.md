# Winx — Gallop Canon Template

Winx is a Next.js template for writers, journalists, and content creators built on the Gallop Canon architecture system. Canon provides ESLint rules (`@gallop.software/canon/eslint`) and an audit CLI (`gallop audit`) that enforce the patterns below. The `CLAUDE.md` file is the canonical AI reference — there is no auto-generation pipeline.

## Auto-Generated Files — Never Edit Manually

| File | Regenerate With | Triggered By |
|---|---|---|
| `_data/_pages.json` | `npm run pages` | Adding/removing page routes |
| `src/app/(demo)/block/[[...slug]]/_block-index.ts` | `npm run blocks` | Block additions/removals |
| `_fonts/` | — | Font source files (do not edit) |

## Build Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (auto-runs npm run pages) |
| `npm run pages` | Regenerate page route metadata for the page sitemap and search |
| `npm run blocks` | Regenerate block index for /block demo previews |
| `npm run lint` | ESLint check (run after edits) |
| `npm run ts` | TypeScript check |
| `npm run check` | lint + ts combined |
| `npm run prettier` | Format code |

## File & Folder Authority

These rules govern what AI is allowed and forbidden to do when creating, moving, or modifying files and folders.

### Defined `/src` Structure

```
src/
├── app/          # Routes, layouts, metadata (Next.js App Router)
│   └── {route}/
│       ├── page.tsx
│       └── _blocks/  # Co-located page-specific blocks
├── components/   # Reusable UI primitives
├── fonts/        # Font definitions (accent, body, heading, heading2, heading3)
├── hooks/        # Custom React hooks
├── styles/       # CSS, Tailwind
├── tools/        # Utility tools
├── utils/        # Utility functions
└── state.ts      # Global state
```

### App Router Structure

Routes must use Next.js route groups. At minimum, `(default)` must exist:

```
src/app/
├── (default)/        # Required - default layout group
│   ├── _blocks/      # Shared blocks for the route group
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx # 404 inside the group's layout
│   ├── [year]/       # Archive routes
│   ├── author/
│   ├── category/
│   ├── search/
│   └── tag/
├── api/              # API routes (exception - no grouping)
├── layout.tsx        # Root layout
├── metadata.tsx      # Shared metadata
├── error.tsx         # Error boundary
├── not-found.tsx     # 404 page
└── robots.ts
```

- All page routes must be inside a route group (parentheses folder)
- Never create routes directly under `src/app/` (except `api/`, root files)
- New route groups are allowed freely when a new layout variant is needed

### File Structure Rules

**Blocks:**
- Co-located in `_blocks/` subdirectories alongside each page route
- Singleton naming: `hero.tsx` (one per page), numbered when multiple: `content-2.tsx`, `content-3.tsx`
- Import with relative paths: `import Hero from './_blocks/hero'`
- Example: `src/app/(default)/furniture/_blocks/hero.tsx`

**Components:**
- Simple components: Single file in `src/components/`
- Complex components: Folder with `index.tsx`
- Use folders when component has multiple sub-files

### DO — What AI IS Allowed To Do

- Create files only inside existing Canon-defined zones
- Place new files in the zone that matches their architectural role
- Follow existing folder conventions within a zone
- Reuse existing folders when possible
- Create new route groups in `src/app/` when new layouts are needed
- Create new archive content folders (like `blog/`, `portfolio/`) in `/src`
- Create dotfiles/directories at project root (`.github/`, `.cursor/`, etc.)
- Import generated `_data/*.json` in runtime code via `@/../_data/*` (bundled at build time)
- Ask for confirmation if the correct zone is ambiguous

### DO NOT — What AI Is Forbidden To Do

- Create new top-level directories (except dotfiles)
- Create new folders in `/src` (except archive content or route groups)
- Place files outside Canon-defined zones
- Mix responsibilities across zones (components importing blocks, etc.)
- Reorganize or move folders without explicit instruction
- Invent new organizational conventions
- Create placeholder or speculative files
- Import from `_scripts/` in runtime code (Node-only deps: `fs`, `jsdom`, etc.)
- Read files from disk at runtime (`fs.readFileSync` + `process.cwd()`, `fs.readdirSync`) — there is no filesystem on Cloudflare Workers, so it throws `ENOENT` or silently returns empty; import generated JSON via `@/../_data/*` instead, and add a `_scripts/` generator if the data does not exist yet
- Manually edit files in `_data/` (generated only)

## Content Index

Posts, categories, tags, authors and search text are NOT generated at build time. They live in the D1 database (the content index), filled from WordPress by the Sync and Rebuild buttons, so a new post appears without a deploy.

| Need | Use |
|---|---|
| A page of posts, filtered or searched | `filterPosts()` in `src/utils/filter-posts.ts` |
| One post, the latest post, the archive, sitemap rows, search hits | `src/utils/content-index.ts` |
| Categories, tags, authors | `src/utils/taxonomies.ts` |
| WordPress pages: the one at a path, the page tree, a page's parents, sitemap rows | `src/utils/pages.ts`; a page's body and SEO come from `getWordPressPage()` in `src/utils/post-cache.ts`, cached like a post's |
| A post's title, description, canonical, robots, share image and dates for search engines | `resolvePostSeo()` in `src/utils/post-seo.ts`: the SEO plugin's value (Yoast, through Gallop's `seo` and the index's `seo_title`, `seo_description`, `noindex`), then the post's, then the site's |
| The same for a category, tag or author page, and its `?page=N` | `archiveMetadata()`, `archiveSchema()` in `src/utils/archive-seo.ts` |
| Structured data (JSON-LD) | `buildPageSchema()`, `buildArticleSchema()` in `src/utils/structured-data.ts`; site-wide nodes and the site's name in `src/app/metadata.tsx` |
| Categories in a client component | `useCategories()` in `src/hooks/use-categories.tsx` |
| Writing to the index | `src/utils/content-sync.ts`, through `/api/sync`; the one exception is `recordCommentCount()` in `src/utils/content-index.ts` |
| A post's comments, reading and sending | `src/utils/comments.ts`, through `/api/comments` |
| Comments in a client component | `useComments()` in `src/hooks/use-comments.tsx` |
| Members: who is logged in | `readSession()` in `src/utils/member-session.ts` (the cookie, no WordPress); `useMember()` in `src/hooks/use-member.tsx` in a client component |
| Members: WordPress | `src/utils/members.ts`, through `/api/account/*` |
| Members: confirming a new account's address | `src/utils/account-confirm.ts`: the site signs the link, emails it and reads it back; `createMember()` is only called for a link `readSignUp()` accepted |
| Admin routes | `requireAdmin()` in `src/utils/admin-session.ts`: cookie, same origin, then WordPress |
| Mailing list: subscribers, joining, leaving, managing | `src/utils/subscribers.ts`; sign-up and confirmation through `/api/newsletter/*` (`src/utils/newsletter.ts`), management through `/api/mailing/subscribers` |
| Marketing email: campaigns, recipients, reports | `src/utils/mailing.ts`, through `/api/mailing/*` (every route wrapped in `adminRoute()` from `src/utils/mailing-route.ts`) |
| Marketing email: the email itself | `composePostEmail()` in `src/utils/email-compose.ts`; template in `src/utils/email-template.ts`, post body in `src/utils/email-post-content.ts` |
| Marketing email: open, click and unsubscribe links | `src/utils/email-tracking.ts`, through `/api/email/*` (public, signed per recipient) |
| Marketing email: delivery events from Cloudflare | `recordEmailEvent()` in `src/utils/email-events.ts`, called by the queue handler in `worker.ts` |
| Marketing email in a client component | `useCampaignSend()`, `mailingCall()` in `src/hooks/use-mailing.tsx`; `useSubscriberList()`, `actOnSubscribers()` in `src/hooks/use-subscribers.tsx` |
| Page views: counting one, reading the counts and the visit log | `src/utils/page-views.ts`; counted through `/api/view` (public, sent by `src/hooks/page-view.tsx`), read through `/api/analytics/*` (wrapped in `adminRoute()`) |
| Page views in a client component | `AnalyticsDialog` in `src/components/analytics`, opened from the admin toolbar; it loads with `mailingCall()` |
| The admin toolbar's numbers (the site's visitors today, the page's views all time) | `readLiveCounts()` in `src/utils/page-views.ts`, through `/api/analytics/live` (wrapped in `adminRoute()`), read once per page load by `AdminBar` in `src/components/admin-bar.tsx` |
| FlowTrace: a visit that converted, recorded and reported | `/api/flow-trace` (public, sent by `src/hooks/flow-trace.tsx`) writes through `src/utils/flow-trace-store.ts` and emails through `reportConversion()` in `src/utils/flow-trace-jobs.ts` (`flowTraceContext()` in `src/utils/flow-trace-mail.ts` inside a request; `worker.ts` builds its own for the cron) |
| FlowTrace: the box, its routes and its emails | `FlowTraceDialog` in `src/components/flowtrace`, opened from the admin toolbar or `/?flowtrace=visit-<id>`; reads `/api/flowtrace/*` (wrapped in `adminRoute()`) with `useFlowTraceRead()` in `src/hooks/use-flow-trace.tsx`; emails in `src/utils/flow-trace-email.ts`; settings in `src/utils/flow-trace-config.ts` |
| The admin toolbar's demo, for a visitor who is not an administrator; off unless `NEXT_PUBLIC_ADMIN_DEMO=true` (the template's own showcase only) | `useDemo()` in `src/hooks/use-demo.tsx` turns it on (from the sidebar's Try the admin toolbar); `mailingCall()` then answers every toolbar call from made-up data in `demoCall()` (`src/utils/demo-api.ts`); the one real action, a post emailed once to the visitor, is `/api/demo/email` |

- Every helper above is `async` and server-only, except the demo's, which run in the browser
- Every path WordPress publishes is served by `src/app/(default)/[...path]/page.tsx`: a year, a month, a post, or a page the index knows. A static route folder beside it wins. Pages are not hand-built in the app: they are edited in WordPress and reach the index with Sync or Rebuild (`syncPages()`), and a page behind a password is left out
- A page or route that reads the index must set `export const dynamic = 'force-dynamic'`: the database only exists inside a request, not during the build
- Every page the site builds is kept for 24 hours in the Cache API by the Worker's page cache (`src/utils/page-cache.ts`, in front of Next.js in `worker.ts`), a copy per Cloudflare location like a CDN's edge: an expired copy is served stale and rebuilt behind the visitor, a cleared one is rebuilt in front of the first visitor. Every menu link in `src/components/navigation.tsx` and every post link in the blog list is prefetched, so a click swaps the page in from the browser. Pages are cleared by tag (`pageTag()`: a post's own, a WordPress page's own, or `lists` for home, archives, date, category, tag, author and search pages, plus `site` for all): `clearPagesAt(paths)` for a changed post or page and the lists (Revalidate, Sync, a comment posted through the site), `clearPagesNow()` for everything (Clear cache, Rebuild, and `npm run cf:deploy` through `cf:clear-pages`). A page's HTML must therefore never depend on who is looking (no cookies or headers read on the server; member and admin state is loaded in the browser). A response that must never be kept lives under `/api/`, or takes a query string other than `page`
- Client components never import these helpers: pass data down as props, or fetch `/api/posts`, `/api/search`, `/api/categories`
- The index tables are not in `prisma/schema.prisma`; change them with a hand-written SQL migration in `prisma/migrations/`
- Requests to WordPress go through `fetchWordPress()` and `postWordPress()` in `src/utils/wp-fetch.ts`, one at a time, never in parallel (the host answers bursts with 429)
- A post's comments and its comment count follow the post's rule: kept for 24 hours, refreshed by Sync, Revalidate and Clear cache, and when a comment is posted through the site. Comment counts live in `posts.comment_count`, filled by Rebuild and Sync and by `recordCommentCount()` whenever a post's comments are read. A visitor's request must never make the site wait on WordPress for comments
- Comment HTML from WordPress is only ever turned into nodes by `sanitizeCommentHtml()` in `src/utils/comment-html.ts`, and shown by `CommentBody`. Never render it with `dangerouslySetInnerHTML`, `html-react-parser`, or `ParseBlocks`
- `GALLOP_WP_API_KEY` is read on the server only, from `process.env` inside a function. Never send it to the browser, log it, or give it a `NEXT_PUBLIC_` name
- A member's session is the `gallop_member` cookie, signed with a key derived from the API key in `src/utils/member-session.ts`. A page view by a member never asks WordPress; WordPress is asked on login, when a confirmed sign-up chooses its password, and on saves, and by `requireAdmin()` before any admin action. The email address is never in the cookie or in `state.member`
- Marketing email is an administrator's alone. Every route under `/api/mailing` goes through `adminRoute()`; subscribers' email addresses are only ever returned by those routes, and never put in `state` or a cookie
- The mailing list is D1's `subscribers` table and nothing else. A WordPress account says nothing about email: never read or write `gallop_subscribed`, and never treat a role as a subscription. Only `status = 'subscribed'` is ever sent a campaign; unsubscribed, bounced and complained rows are kept so they are never written to again
- An address joins the list only after confirming it (`/newsletter/confirm/`), except a member whose address WordPress has verified, or someone an administrator adds with the consent tick
- Whether a member is subscribed is read from D1 by `withSubscription()`, never kept in the session cookie
- An email's HTML is written for mail programs: tables, inline styles, absolute URLs. Never reuse `ParseBlocks` or site components for it, and never render post content into an email except through `renderPostForEmail()`
- Recording an open or a click never waits on WordPress. `src/utils/email-events.ts` is also bundled outside Next.js by `worker.ts`, so it must not import `server-only` or anything that does
- Counting a page view never makes a visitor wait: `/api/view` answers at once and writes in `waitUntil`. Only pages that exist are counted, and never a bot's view or a logged-in administrator's
- The visit log (`page_view_log`) holds visitors' IP addresses. They are only ever returned by the routes under `/api/analytics`, never put in `state` or a cookie. Both the log and the daily counts (`page_views`) are kept forever; nothing prunes them
- A visitor is an IP address seen for the first time that day. `recordPageView()` asks the log and counts it in one `db.batch()`, with the log row written last: keep that order, or a view finds itself and is never a visitor
- FlowTrace stores only visits that converted (the contact form, a newsletter sign-up, an account created, an email or phone link, a `[data-ft]` click); every view and visit is counted by Analytics alone, and FlowTrace's Overview reads its visit counts from there (`readSiteVisits()` in `src/utils/page-views.ts`). The visit stays in the visitor's browser until they convert
- `/api/flow-trace` is public: same origin, 64 KB, paths of this site only, no bots, no administrators, 30 stored visits an hour per address (`member_attempts`), report emails capped at 30 an hour and 5 per address. Place and device come from Cloudflare's request; nothing is sent to an outside service. A report's subject never holds a visitor's text, and everything in an email body goes through `escapeHtml()`
- `src/utils/flow-trace-{config,types,format,email,store,jobs}.ts` are bundled by `worker.ts` for the cron, so they must not import `server-only` or anything that does; they are handed the database, the mailer, the recipients and the site instead of reading them
- Who FlowTrace emails is `FLOWTRACE_EMAILS` (or `EMAIL_TO`), in the private environment only. Each send is written to `ft_report_sends`, and a visit's `report_status` says how its report went; the box shows both
- The demo never calls a route under `/api/mailing`, `/api/analytics`, `/api/flowtrace`, `/api/sync` or `/api/revalidate`, and never reads a private table: its subscribers, campaigns and visits are made up in the browser from the published posts. `/api/demo/email` sends only the post as written, under its own title, to one address, once a day per visitor and per address, and 40 a day in all. Its FlowTrace test report is a made-up sample visit built from the latest post, once per address ever (a keyed hash in `demo_sends`, migration 0014) and five a day per IP; its links open the demo (`/?flowtrace=demo`)
- Every route under `/api/account` goes through `src/utils/account-route.ts`: same origin, the hidden field, size limit, and the limits in `src/utils/member-guard.ts` (`member_attempts`)

## Enforced Patterns (ESLint)

These patterns are enforced by `@gallop.software/canon/eslint`. Violations will be flagged.

- **001: Server-First Blocks** — `gallop/no-client-blocks` — Blocks must be server components
- **002: Layout Hierarchy** — `gallop/no-container-in-section` — No Container inside Section
- **003: Typography Components** — `gallop/prefer-typography-components` — Use Paragraph/Span, not raw tags
- **004: Component Props** — `gallop/prefer-component-props` — Use props over className for supported styles
- **006: Block Naming** — `gallop/block-naming-convention` — Descriptive kebab-case naming, PascalCase exports
- **007: Import Paths** — `gallop/prefer-alias-imports` — @/ aliases, direct file imports
- **008: Tailwind Only** — `gallop/no-inline-styles` — No inline styles in blocks, components allowed for dynamic values
- **009: Color Tokens** — `gallop/no-raw-colors` — Use semantic color tokens
- **012: Icon System** — `gallop/no-inline-svg` — Iconify with Icon component
- **014: clsx Not classnames** — `gallop/no-classnames-package` — Use clsx, never classnames package
- **018: Layout Components** — `gallop/prefer-layout-components` — Use Grid/Columns, not raw div with grid
- **019: Background Image Rounded** — `gallop/background-image-rounded` — Background images must have rounded="rounded-none"
- **020: No Arbitrary Colors** — `gallop/no-arbitrary-colors` — Use defined color tokens, not arbitrary color values
- **021: Cross-Zone Import Boundaries** — `gallop/no-cross-zone-imports` — Enforce import boundaries between Canon zones
- **024: React Intersection Observer** — `gallop/no-native-intersection-observer` — Use react-intersection-observer package, not native API
- **025: No Components in Blocks** — `gallop/no-component-in-blocks` — Exported component functions must be in components folder; non-exported content components are allowed in blocks
- **026: List Components** — `gallop/prefer-list-components` — Use List/Li, not raw ul/li tags
- **027: Luxon for Dates** — `gallop/no-native-date` — Use Luxon DateTime, not native JavaScript Date

## Documentation Patterns

These patterns are not enforced by ESLint but should be followed.

- **005: Page Structure** — PageWrapper, generatePageMetadata pattern
- **010: Spacing System** — Standard padding/margin values
- **011: Responsive Mobile-First** — sm/md/lg/xl breakpoint usage
- **013: New Component Pattern** — Props for margin/color/fontSize
- **015: No Inline Hover Styles** — Tailwind for hover states
- **016: Client Extraction** — Extract hooks to components, not blocks (see Pattern 001 for enforcement)
- **017: SEO Metadata** — PageMetadata structure, structured data

## Color Token System

All colors use semantic tokens defined in `src/styles/tailwind.css` `@theme`:

- **Surface**: `body`, `body-light`, `body-dark`, `body2`
- **Text**: `contrast`, `contrast-light`, `contrast-dark`
- **Overlay** (fixed — don't flip in dark mode): `overlay`, `overlay-text`
- **Toolbar** (the admin toolbar's black): `toolbar`
- **Accents**: `accent`, `accent-light`, `accent-dark`, `accent-contrast`, `accent2`, `accent2-light`, `accent2-dark`, `accent2-contrast`, `accent3`, `accent3-light`, `accent3-dark`, `accent3-contrast`, `accent4`, `accent4-light`, `accent4-dark`, `accent4-contrast`, `accent5`, `accent5-light`, `accent5-dark`, `accent5-contrast`

**Never use**: `gray-*`, `white`, `black`, `slate-*` — always map to a semantic token.

## Component Quick Reference

- `Heading` - props: `as`, `color`, `margin`, `fontSize`, `fontWeight`, `textAlign` (h1/h4 default text-accent; h2/h3/h5/h6 default text-contrast)
- `Paragraph` - props: `color`, `margin`, `fontSize`, `lineHeight`, `textAlign`
- `Span` - props: `color`, `margin`, `fontSize` (Inline text, mb-0 default)
- `Label` - props: `color`, `margin`, `fontSize`, `fontWeight`, `textAlign`
- `Accent` - props: `color`, `margin`, `size`, `textAlign` (Has conditional text-shadow when color='text-body')
- `Quote` - props: `variant`, `color`, `margin`, `fontSize`, `fontWeight`, `textAlign`
- `Section` - props: `overlayColor` (Wraps content with Container. Default overlay bg-overlay/30)
- `Cover` - props: `overlayColor` (Full-height hero-style with image backgrounds)
- `Columns` - props: `cols`, `gap`, `align`
- `Column`
- `Button` - props: `href`, `variant`, `icon`, `iconPlacement`, `margin`, `dark` (dark prop flips light/dark variant class sets (render-time boolean, not CSS dark mode))
- `Icon` (Iconify icon wrapper. Always include sizing class (w-5 h-5))
- `Image` - props: `size` (Always use size prop ('small'|'medium'|'large'|'full'). Uses getStudioImage() from src/utils/studio-helpers.ts)

## State Management

valtio store at `src/state.ts`. Read with `useSnapshot(state)`, write with `state.propName = value`.

Available state: `playVideo`, `offsetTop`, `windowHeight`, `lastOffsetTop`, `isScrolling`, `dialogOpen`, `scrollingDirection`, `lastScrollingDirection`, `lockScrollDirection`, `member`, `memberLoaded`, `loginOpen`, `categories`, `editTarget`, `likeCounts`, `shareCounts`, `commentCounts`, `liked`, `demo`.

## Template-Specific Rules

- Use the color prop on typography components (Heading, Paragraph, Label, Span, Accent)
- Use props (fontSize, margin, fontWeight, textAlign) instead of className when a component prop exists
- Import icons from @iconify/icons-heroicons/ or @iconify/icons-lucide/
- After publishing or editing posts in WordPress, log in and press Sync (updates the content index in D1); there is no build step for posts

## Do NOT

- Use `'use client'` in blocks - extract to components
- Use raw `<p>`, `<span>`, or `<h1>`–`<h6>` - use Paragraph/Span/Heading components
- Use className for margin/color/fontSize when component has props
- Use Container inside Section - Section already provides containment
- Use `classnames` package - use `clsx` instead
- Use inline styles for hover states - use Tailwind classes
- Use native `IntersectionObserver` - use `react-intersection-observer` package
- Use inline `<svg>` in blocks - use the Icon component with Iconify icons
- Use deep relative imports (`../../`) - use `@/` alias imports
- Use gray-*, white, black, slate-* — always map to a semantic token
- Put text color in className when component has a color prop
- Manually construct image URLs when a _data/_studio.json metadata entry exists
- Read generated JSON with fs at runtime - import it instead (no filesystem on Cloudflare Workers)
- Read posts or taxonomies from a JSON file - read the content index instead
- Fetch WordPress in parallel - the host refuses bursts with 429
- Manually edit files in _data/ (generated only)

## Post-Edit Verification

After editing files:
1. Run `npm run lint`
2. Run `npm run ts`
3. Fix any violations before committing

Note: Only lint files you edited, not the entire codebase.
