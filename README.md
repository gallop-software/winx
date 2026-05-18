# Winx

[![Winx Theme](public/images/screenshot.jpg)](https://winx.gallop.software)

A modern blog and publishing template for writers, journalists, and content creators who want to launch at the speed of thought with AI, publish more polished posts than the competition, and rank #1 on Google.

**🌐 Demo:** [winx.gallop.software](https://winx.gallop.software)  
**🎨 Template:** [gallop.software/templates](https://gallop.software/templates)  
**📦 Repository:** [github.com/gallop-software/winx-pro](https://github.com/gallop-software/winx-pro)  
**🏷️ Category:** Blog Template

---

## Why Use Gallop Templates?

Just chat with AI inside your code editor using our Gallop templates, and you will never want to run a blog on WordPress again. Simply describe the post, layout, or feature you want, and AI writes the code. No CMS, no plugin sprawl, no clunky admin panels, and no design limitations. Just type and watch. Build beautiful article layouts, add smooth reading animations, configure your SEO and AI discoverability instantly, expand endlessly, and get prompting tips from our [Gallop community](https://gallop-software.slack.com/). Go live in minutes.

[![Watch: Design your blog by chatting with AI](https://img.shields.io/badge/Watch:_Design_your_blog_by_chatting_with_AI-166534?style=for-the-badge)](https://gallop.software/#learn-more)

---

## Features

- 🚀 **Next.js 16.2** with App Router
- ⚛️ **React 19** for cutting-edge performance
- 🎨 **Tailwind CSS 4.2** for pixel-perfect design
- ✍️ **TSX-powered posts** - Write articles as components, no CMS required
- 📚 **Rich blog archives** - Category, tag, author, and year pages built in
- 🖼️ **Image processing** with automatic optimization
- 🔍 **Built-in search** powered by FlexSearch
- 📡 **RSS feed** for subscribers and syndication
- 💬 **Share counts** powered by Prisma and KV cache
- 📱 **Fully responsive** and mobile-optimized for readers
- ⚡ **Lightning-fast** page loads for long-form content
- 🎭 **Framer Motion** animations
- 🎯 **SEO and AI optimized** with article structured data
- 🤖 **AI-friendly** codebase structure
- 🛡️ **Gallop Canon** - AI guardrails for consistent, reliable code
- 📊 **Vercel Analytics** integration

---

## Getting Started

New to this? No problem. You'll have AI guiding you the entire way. Choose your editor below and follow the steps.

### Choose Your Editor

We recommend the **Gallop AI Editor** for the best experience with Gallop templates — whether you're a first-time blogger or an advanced Next.js developer who wants AI-assisted writing and development. It was purpose-built for this workflow and requires zero configuration. VS Code is also a fine choice if you prefer to work without AI assistance.

| | Gallop AI Editor | VS Code |
|---|---|---|
| **Best for** | Writers, non-programmers, junior and advanced programmers | Advanced programmers |
| **AI built in** | Yes — Claude AI ready to go | No (optional extensions available) |
| **AI setup requirement** | Enter Claude API keys | Install extensions manually |
| **Template browser** | Built-in marketplace | Download ZIP from GitHub |
| **Media manager** | Built-in Studio with CDN sync | Manual file management |
| **Font manager** | Built-in Studio with WOFF2 font generation | No support |
| **SEO Audit** | Analyze SEO & Structured Data | No support |
| **Git** | Better Git UI with modal diff viewer | Default Git UI |
| **Node.js** | Built-in installer and version manager | Install Node.js separately |

---

### Option A: Gallop AI Editor (Recommended)

The Gallop AI Editor is a desktop app built specifically for AI-powered web development for Next.js. It includes everything you need — code editor, AI assistant, Git, terminal, media manager, font manager, SEO & structured data scanner, and a template marketplace — all in one window with nothing to configure.

[![Download Gallop AI Editor](https://img.shields.io/badge/Download_Gallop_AI_Editor-166534?style=for-the-badge)](https://gallop.software/)

Available for Mac and Windows.

#### Step 1: Install Gallop AI Editor

1. Go to [gallop.software](https://gallop.software/) and download the installer for your platform
2. Open the installer and follow the prompts
3. Launch the Gallop AI Editor
4. If prompted, the editor will walk you through installing Node.js automatically — just follow the on-screen steps

#### Step 2: Open This Template

**From the built-in template marketplace:**

1. Click the **Templates** tab in the sidebar
2. Find **Winx** and click **Clone**
3. Choose a folder on your computer (like your Desktop)
4. The editor will download and set up the project for you

**Or from a ZIP download:**

1. Click the green **Code** button at the top of this GitHub page, then click **Download ZIP**
2. Unzip the folder somewhere easy to find (like your Desktop)
3. In the Gallop AI Editor, click **Open Project** and select the unzipped `winx` folder

#### Step 3: Start the Dev Server

1. Click the **Terminal** tab at the bottom of the editor
2. Click **Install** to install dependencies, then click **Start** to run the dev server
3. Open [http://localhost:3000](http://localhost:3000) in your browser to see your blog

#### Step 4: Chat with AI

Click the **AI Chat** panel (or press `Cmd+E` on Mac / `Ctrl+E` on Windows) to open the AI assistant. Now just ask:

```
I'm new to this. Help me customize this blog for my niche.
```

The AI assistant can read and edit your project files, run commands, and explain anything you're confused about. Just describe what you want in plain English:

```
Write a new blog post about sourdough baking and add it to the blog
```

```
Make the accent color a warm terracotta
```

```
Add a new category called Travel
```

```
Optimize the SEO and article structured data on my latest post
```

**Tip:** Press `Cmd+Ctrl+3` (Mac) to take a screenshot of your running blog and attach it to the chat. The AI can see exactly what you see and suggest changes visually.

---

### Option B: VS Code

VS Code is a good choice if you prefer to work without AI assistance. You'll need to install a few things manually.

[![Download VS Code](https://img.shields.io/badge/Download_VS_Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com)

#### Step 1: Install Prerequisites

1. Install [VS Code](https://code.visualstudio.com)
2. Install [Node.js](https://nodejs.org) (version 20 or higher)
3. Install [Git](https://git-scm.com)

#### Step 2: Download This Template

Click the green **Code** button at the top of this GitHub page, then click **Download ZIP**. Unzip the folder somewhere easy to find (like your Desktop).

#### Step 3: Open in VS Code

1. Open VS Code
2. Click **File → Open Folder**
3. Select the unzipped `winx` folder
4. Click **Open**

#### Step 4: Install and Run

Open the terminal in VS Code (`Ctrl+`` ` on Mac/Windows) and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your blog. Press `Ctrl+C` to stop the server.

#### Step 5: Start Writing

Add new posts as TSX files in `src/blog/`, then run `npm run blog` to regenerate metadata. Refer to the [Project Structure](#project-structure) and [Available Scripts](#available-scripts) sections below for guidance.

---

### Join the Community

Connect with other Gallop users on Slack. Share your progress, swap AI prompting tips, and see how non-programmers are launching blogs that once required a full editorial team.

[![Join Slack](https://img.shields.io/badge/Join_Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)](https://gallop-software.slack.com/)

---

## Put Your Blog Online

When you're ready to share your blog with the world, you'll need a free [GitHub](https://github.com) account to store your code and a free [Vercel](https://vercel.com) account to host your site.

### The Easy Way

Just ask your AI assistant:

```
Help me create a GitHub account, push this project to GitHub, and deploy to Vercel
```

The AI will walk you through every step. When you're done, your blog will be live with a URL you can share.

### For Technical Users

If you're comfortable with Git:

#### Step 1: Create Your Repository

[![Winx Pro](https://img.shields.io/badge/Winx_Pro-6366F1?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gallop-software/winx-pro/generate)

#### Step 2: Clone Your Repository

Ask your AI assistant:

```
Help me clone my new GitHub repository and run it locally
```

Or run these commands in your terminal:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your blog. Press `Ctrl+C` to stop the server. When ready to test production, run `npm run build` then `npm start`.

#### Step 3: Deploy to Vercel

[![Deploy with Vercel](https://img.shields.io/badge/Deploy_with_Vercel-2563EB?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new/clone?demo-title=Winx&demo-description=A%20modern%20blog%20and%20publishing%20template%20for%20writers%2C%20journalists%2C%20and%20content%20creators%20who%20want%20to%20launch%20at%20the%20speed%20of%20thought%20with%20AI%2C%20publish%20more%20polished%20posts%20than%20the%20competition%2C%20and%20rank%20%231%20on%20Google.&demo-url=https%3A%2F%2Fwinx.gallop.software&demo-image=https%3A%2F%2Fwinx.gallop.software%2Fimages%2Fscreenshot-md.jpg&from=templates&project-name=winx-pro&repository-name=winx-pro&repository-url=https%3A%2F%2Fgithub.com%2Fgallop-software%2Fwinx-pro)

Select your repository, and Vercel will automatically deploy whenever you push changes.

Congratulations! Your blog is now live to the world. Share your new URL and start growing your readership. Ready for a custom domain? See [Vercel's domain setup guide](https://vercel.com/docs/projects/domains).

### Winx Pro

Want access to all premium blocks and post layouts? [Purchase Winx Pro](https://gallop.software/code/winx/blocks#pricing) and clone from the Pro repository, which includes all Pro blocks ready to use.

---

## About Gallop Templates

Winx is part of the [Gallop](https://gallop.software) template ecosystem. Gallop templates are designed to be built with AI — just describe what you want in plain English and watch your blog come to life.

### Gallop AI Editor

The [Gallop AI Editor](https://gallop.software/) is a desktop code editor built specifically for AI-powered web development. It combines a full code editor, Claude AI assistant, visual Git interface, integrated terminal, media manager, and template marketplace into one app. Everything is preconfigured to work with Gallop templates out of the box — no extensions, no plugins, no setup.

**Key highlights:**

- **Claude AI built in** — Chat with Claude to write posts, debug issues, and learn as you go. Supports Opus 4.6, Sonnet 4.6, and Haiku 4.5 models
- **Agent and Plan modes** — Agent mode lets AI apply changes automatically. Plan mode shows you what AI wants to do before it does it, so you stay in control
- **Screenshot capture** — Press `Cmd+Ctrl+3` to screenshot your running blog and share it with AI for visual feedback
- **Built-in template marketplace** — Browse and clone Gallop templates without leaving the editor
- **Visual Git** — Stage, commit, and merge with a 3-column visual interface. No command line required
- **Studio media manager** — Manage post images, fonts, and assets with thumbnail previews and CDN sync
- **Node.js manager** — Install and switch Node.js versions without touching the terminal
- **Auto-updates** — The editor keeps itself up to date automatically

### Gallop Canon: AI Guardrails

Every Gallop template includes `@gallop.software/canon`, a system of ESLint rules and AI instructions that keep your AI assistant on track. Canon ensures:

- **Consistent architecture** - AI follows the same patterns across your entire codebase
- **No breaking changes** - Guardrails prevent AI from introducing common mistakes
- **Faster writing and publishing** - AI already knows the project structure, components, and conventions
- **Quality code** - Enforced best practices for performance, SEO, AI discoverability, and maintainability

Think of Canon as training wheels that never come off. AI stays within proven patterns, so you get reliable results every time.

**Canon Commands:**

- `npm run check` - Run lint, TypeScript, and unused checks together
- `npm run generate:ai-rules` - Regenerate AI rules from Canon
- `npm run update:canon` - Update to latest Canon version

### Built for SEO and AI Discoverability

This template was crafted from the ground up to get your articles ranked #1 on Google and cited by AI assistants like ChatGPT and Google's Gemini. The software architecture, semantic HTML structure, article metadata system, and structured data are optimized for both search engine crawlers and AI models that surface content to readers.

AI citations are becoming more important than traditional SEO. When someone asks an AI assistant a question, you want your post to be the source it quotes. Gallop templates ship with the Article, BlogPosting, and Author structured data that AI models rely on to understand and surface your writing. Writers using this template are already ranking on Google and getting discovered by AI assistants.

### What You Can Build

- **Publish with AI** - Let AI draft, edit, and format posts while you provide the ideas and voice
- **Skip the boring work** - Let AI help with SEO, image optimization, tags, and tedious metadata updates
- **Pixel-perfect article design** - TailwindCSS integration for rapid styling without leaving component files
- **Automate workflows** - AI-powered scripts for sitewide SEO improvements, search indexing, RSS feeds, and image regeneration
- **Get found online** - Battle-tested foundation with article structured data for search engines and AI assistants
- **Deploy instantly** - Next.js architecture on Vercel for cheap, fast hosting

### Built by Industry Veterans

The [team](https://webplant.media) behind Gallop has decades of combined experience building websites, apps, and web applications for top global brands. We've helped publishers achieve #1 Google rankings in competitive markets and understand what it takes to build world class editorial sites. That expertise is baked into every template, every component, and every line of code.

---

## Project Structure

```
winx/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (default)/         # Default layout route group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Blog home / latest posts
│   │   │   ├── _blocks/       # Home page blocks
│   │   │   ├── [year]/        # Yearly archive pages
│   │   │   ├── author/        # Author archive pages
│   │   │   │   └── [slug]/
│   │   │   ├── category/      # Category archive pages
│   │   │   │   └── [slug]/
│   │   │   ├── tag/           # Tag archive pages
│   │   │   │   └── [slug]/
│   │   │   ├── search/        # Search results page
│   │   │   ├── contact/
│   │   │   └── .../           # Other routes with _blocks/
│   │   ├── (post)/            # Blog post layout group
│   │   │   ├── layout.tsx
│   │   │   └── post/[slug]/   # Dynamic blog post route
│   │   ├── api/               # API routes (share counts, etc.)
│   │   ├── global-error.tsx   # Error boundary
│   │   ├── global-not-found.tsx # 404 page
│   │   ├── layout.tsx         # Root layout
│   │   ├── metadata.tsx       # Site metadata
│   │   ├── robots.ts          # Robots.txt config
│   │   ├── sitemap.ts         # Sitemap config
│   │   └── *.png, *.ico       # App icons and favicon
│   ├── blog/                  # Blog post content (TSX files)
│   ├── components/            # React components
│   │   ├── navbar/           # Main navigation
│   │   ├── blog/             # Blog post components
│   │   ├── search/           # Search components
│   │   ├── footer/           # Footer components
│   │   ├── form/             # Form components
│   │   ├── lightbox/         # Lightbox gallery for post images
│   │   ├── page-wrapper.tsx  # Page wrapper with structured data
│   │   ├── accordion.tsx
│   │   ├── button.tsx
│   │   ├── card-*.tsx        # Post card variants
│   │   ├── gallery.tsx
│   │   ├── heading.tsx
│   │   ├── image.tsx
│   │   ├── logo.tsx
│   │   ├── section.tsx
│   │   └── ...
│   ├── fonts/                # Font configuration files
│   ├── hooks/                # Custom React hooks
│   ├── styles/               # Global styles
│   │   └── tailwind.css     # Tailwind CSS entry
│   ├── tools/                # Utility tools
│   ├── utils/                # Helper functions
│   └── state.ts              # Global state management
├── prisma/                    # Prisma schema (share counts, etc.)
├── public/
│   ├── favicon.png           # Favicon
│   ├── images/               # Processed images
│   ├── screenshot.jpg        # Featured image
│   └── search-index.json    # FlexSearch index
├── _fonts/                   # Font source files (managed by Studio)
├── _data/                    # Generated metadata
│   ├── _blog.json           # Blog post metadata
│   └── _studio.json         # Studio/image metadata
├── _scripts/                 # Build scripts
│   ├── generate-blog-metadata.mjs
│   ├── generate-search.mjs
│   ├── seed-share-counts.mjs
│   └── ...
├── next.config.mjs          # Next.js configuration
├── tsconfig.json            # TypeScript config
├── postcss.config.js        # PostCSS config
├── package.json             # Dependencies & scripts
├── knip.config.js           # Unused file detection config
├── eslint.config.mjs        # ESLint config
└── .prettierrc              # Prettier config
```

---

## Available Scripts

### Development

- **`npm run dev`** - Start development server at http://localhost:3000
- **`npm run build`** - Build for production (runs blog metadata first)
- **`npm run start`** - Start production server
- **`npm run lint`** - Run ESLint on all source files
- **`npm run lint:file`** - Run ESLint on a specific file
- **`npm run lint:gallop`** - Run Gallop Canon lint rules on blocks
- **`npm run ts`** - TypeScript type checking without emitting
- **`npm run prettier`** - Format all files with Prettier
- **`npm run check`** - Run lint and TypeScript checks

### Gallop Canon

- **`npm run audit`** - Audit codebase with Gallop Canon
- **`npm run audit:strict`** - Strict audit mode
- **`npm run audit:json`** - Output audit results as JSON

### Content & Assets

- **`npm run blog`** - Generate blog post metadata to `_data/_blog.json` → [docs](./_scripts/generate-blog-metadata.md)
- **`npm run search`** - Build FlexSearch index for site search → [docs](./_scripts/generate-search.md)
- **`npm run seed:shares`** - Seed initial share counts into the database
- **`npm run bust:kv`** - Bust the KV cache for fresh data
- **`npm run blocks`** - Generate blocks catalog with screenshots
- **`npm run blocks:screenshots`** - Force regenerate all block screenshots
- **`npm run layouts`** - Generate layouts catalog from app route groups
- **`npm run layouts:screenshots`** - Force regenerate all layout screenshots

### Environment

- **`npm run env`** - Push `.env.production` to Vercel → [docs](./_scripts/push-env-to-vercel.md)
- **`npm run env:prod`** - Push to production environment
- **`npm run env:prev`** - Push to preview environment

### Package Management

- **`npm run update:check`** - Check for package updates
- **`npm run update:patch`** - Update to latest patch versions
- **`npm run update:minor`** - Update to latest minor versions
- **`npm run update:major`** - Update to latest major versions
- **`npm run update:interactive`** - Interactively choose updates
- **`npm run update:doctor`** - Update and test changes incrementally

### Maintenance

- **`npm run refresh`** - Remove node_modules and .next, then reinstall
- **`npm run clean`** - Remove node_modules, .next, and package-lock.json, then reinstall

---

## Technologies

### Frontend (Runtime)

Every dependency is battle-tested in production and chosen for stability, performance, and long-term maintainability.

- **Next.js** `16.2.1` - React framework with App Router
- **React** `19` - UI library
- **Tailwind CSS** `4.2.2` - Utility-first CSS framework
- **Headless UI** `2.2.9` - Unstyled accessible components
- **Prisma** - Database ORM for share counts and dynamic data
- **Valtio** `2.3.1` - State management
- **Swiper** `12.1.3` - Modern slider/carousel for post galleries
- **Yet Another React Lightbox** `3.30.1` - Image gallery for post media
- **FlexSearch** `0.8.212` - Full-text post search
- **Algolia Autocomplete** `1.19.7` - Search autocomplete
- **Vimeo Player** `2.30.3` - Embedded video for posts
- **Framer Motion** `12.38.0` - Animation library
- **Luxon** `3.7.2` - DateTime library for post dates
- **React Intersection Observer** `10.0.3` - Scroll-based animations and lazy loading
- **React Highlight Words** `0.21.0` - Search result highlighting
- **Iconify Icons** - Icon sets (Heroicons, Lucide, Material Design)
- **clsx** `2.1.1` - Conditional className utility
- **Vercel Analytics** `1.6.1` - Analytics integration
- **Next Third Parties** `16.2.1` - Third-party script optimization

### Development

Tools for building and developing the blog:

- **TypeScript** `5` - Type safety and IntelliSense
- **ESLint** `9` - Code linting
- **Prettier** `3.8.1` - Code formatting
- **Prettier Plugin Organize Imports** `4.3.0` - Auto-organize imports
- **Prettier Plugin Tailwindcss** `0.7.2` - Sort Tailwind classes
- **PostCSS** `8.5.8` - CSS transformations
- **Gallop Canon** - ESLint rules and AI rules generator

### Scripts & Processing

Build-time tools for content and asset generation:

- **Sharp** `0.34.5` - Image processing and optimization for post images
- **Puppeteer** `24.40.0` - Screenshot generation (featured images)
- **jsdom** `27.4.0` - DOM parsing for search index generation
- **@sindresorhus/slugify** `3.0.0` - URL-friendly slugs for posts, tags, and authors
- **xml2js** `0.6.2` - RSS feed generation

---

## Support & Community

- **Documentation:** [gallop.software](https://gallop.software)
- **Issues:** [GitHub Issues](https://github.com/gallop-software/winx-pro/issues)
- **Slack:** [Join Community](https://join.slack.com/t/gallop-software/shared_invite/zt-358q3rdrp-H6kKvKzpR2qgB5xJviAOcw)
- **Professional Services:** [Web Plant Media, LLC](https://webplant.media)

---

## License

MIT License - see [LICENSE](./LICENSE) for details

---

## Credits

**Contributors:**

- [Chris Baldelomar](https://github.com/webplantmedia)
- [Niel Wostan](https://github.com/NielWostan)
- [Rabpreet Singh](https://github.com/Rabpreet1233)

Built with ❤️ by the team at [Gallop](https://gallop.software)

---

## Learn More

- [Gallop AI Editor](https://gallop.software/)
- [Gallop Templates](https://gallop.software/templates)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
