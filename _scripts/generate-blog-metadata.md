# generate-blog-metadata.mjs

Generate blog post metadata index for efficient querying.

**Tier:** Free  
**File:** `_scripts/generate-blog-metadata.mjs`

---

## Usage

```bash
npm run blog
```

**Note:** This script runs automatically before `npm run build`.

## What It Does

1. Scans all `.tsx` files in `src/content/post/`
2. Extracts metadata exports from each post
3. Sorts posts by date (newest first)
4. Generates `_data/_blog.json` with compiled metadata

## Extracted Metadata

- `title` - Post title
- `description` - Post description/excerpt
- `date` - Publication date (YYYY-MM-DD format)
- `categories` - Array of category strings
- `featuredImage` - Path to featured image
- `author` - Author name
- `slug` - Auto-generated from filename

## Blog Post Structure

```tsx
// src/content/post/my-first-post.tsx

export const metadata = {
  title: 'My First Blog Post',
  description: 'A brief description of the post for SEO and previews',
  date: '2025-12-04',
  categories: ['Technology', 'Web Development'],
  featuredImage: '/images/blog/first-post.jpg',
  author: 'John Doe',
}

export default function Post() {
  return (
    <article>
      <h1>My First Blog Post</h1>
      <p>Content goes here...</p>
    </article>
  )
}
```

## Output

Generates `_data/_blog.json`:

```json
[
  {
    "slug": "my-first-post",
    "title": "My First Blog Post",
    "description": "A brief description...",
    "date": "2025-12-04",
    "categories": ["Technology", "Web Development"],
    "featuredImage": "/images/blog/first-post.jpg",
    "author": "John Doe"
  }
]
```

## When to Run

- After creating new blog posts
- After updating post metadata (title, date, categories, etc.)
- Automatically runs before production build

## Why This Exists

Instead of dynamically importing every blog post to list them, this script pre-generates a metadata index. This enables:

- Fast blog listing pages (no component imports needed)
- Efficient pagination
- Quick category filtering
- Better build performance
