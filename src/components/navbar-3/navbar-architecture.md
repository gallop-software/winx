# Navbar3 Architecture

## Overview

Navbar3 is a modular component system organized in `/src/components/navbar-3/`. It shares the same architecture as the main Navbar but with its own configuration for different navigation layouts.

## File Structure

```
src/components/navbar-3/
├── index.tsx              # Main navbar component (Navbar3)
├── types.ts               # TypeScript interfaces
├── config.ts              # Navigation data (links, social, homeLink)
├── desktop-nav.tsx        # Desktop navigation with dropdowns
├── mobile-nav.tsx         # Mobile navigation menu content
├── mobile-nav-button.tsx  # Mobile hamburger button with Dialog sidebar
├── search-button.tsx      # Search functionality
├── social-media-nav.tsx   # Social media icons
└── sticky-navbar.tsx      # Sticky navbar on scroll
```

## Component Breakdown

### `index.tsx`

- **Purpose**: Main entry point for the navbar
- **Export**: `Navbar3`
- **Responsibilities**:
  - Tracks scroll position via `useOffsetTop` hook
  - Manages scroll state for sticky navbar behavior
  - Renders both desktop and mobile navigation
  - Renders sticky navbar that appears on scroll
- **Props**:
  - `className?: string` - Additional CSS classes
  - `dark?: boolean` - When true, renders white text/icons for dark backgrounds (default: false)
  - `hero?: boolean` - When true, positions navbar absolutely over content (default: false)

### `types.ts`

- **Purpose**: Centralized TypeScript type definitions
- **Key Types**:
  - `NavbarProps`: Main navbar props (className, dark, hero)
  - `NavLink`: Navigation link structure with optional dropdowns
  - `DropdownItem`: Dropdown menu item structure
  - `SocialLink`: Social media link structure
  - `PopoverRenderProps`: Headless UI popover render props

### `config.ts`

- **Purpose**: Centralized configuration data for Navbar3
- **Contents**:
  - `homeLink`: Logo link destination
  - `links`: Array of main navigation links with optional dropdowns
  - `socialLinks`: Array of social media links
- **Benefits**: Easy to add/remove/modify navigation items without touching component logic
- **Note**: This config is independent from the main Navbar config

### `desktop-nav.tsx`

- **Purpose**: Desktop navigation with dropdowns
- **Features**:
  - Popover-based dropdown menus using Headless UI
  - `PopoverBackdrop` for click-outside-to-close behavior
  - `CloseButton` wrapping Links for close-on-navigation
  - Multi-column dropdown support (1, 2, or 3 columns)
  - Dropdown positioning (left, center, right)
  - Icon support for dropdown items
  - Dark mode support for white text on dark backgrounds
- **Props**: `isScrolling?: boolean`, `forceCloseOnHide?: boolean`, `dark?: boolean`

### `mobile-nav.tsx`

- **Purpose**: Mobile navigation menu content
- **Features**:
  - Expandable accordion sections using Headless UI Disclosure
  - Framer Motion animations
  - Integrated search button
  - Social media links at bottom
  - Closes menu when clicking navigation links
- **Props**: `close: () => void` - Function to close the mobile menu

### `mobile-nav-button.tsx`

- **Purpose**: Mobile hamburger button with sliding sidebar
- **Features**:
  - Opens Dialog sidebar from the right
  - Animated backdrop overlay
  - Passes `closeModal` to MobileNav for close-on-click behavior
  - Mobile/tablet only (hidden on desktop)
- **Props**: `dark?: boolean`

### `search-button.tsx`

- **Purpose**: Search toggle with keyboard shortcuts
- **Features**:
  - Keyboard shortcut listener (Cmd/Ctrl+K)
  - Opens search modal
  - Dark mode support for white icon
- **Props**: `enableShortcut?: boolean`, `dark?: boolean`

### `social-media-nav.tsx`

- **Purpose**: Desktop social media icons
- **Features**:
  - Renders social links from config
  - Desktop-only display (hidden on mobile)
  - Uses Iconify icons
  - Dark mode support for white icons
- **Props**: `dark?: boolean`

### `sticky-navbar.tsx`

- **Purpose**: Sticky navbar that appears on scroll
- **Features**:
  - Framer Motion slide animation
  - Slides in when scrolling up, slides out when scrolling down
  - Uses same DesktopNav component with `forceCloseOnHide` for proper dropdown behavior
  - Includes desktop nav, search, social links, and mobile button
- **Props**: `isScrolling?: boolean`, `scrollingDirection?: string`

## Dark Mode

The navbar supports a `dark` prop for use on dark backgrounds:

```tsx
<Navbar3 dark={true} />
```

When `dark={true}`:

- Logo switches to white version
- Desktop nav links use white text with `hover:bg-white/10`
- Social media icons use white color
- Search icon uses white color

## Hero Mode

The navbar supports a `hero` prop for overlaying content:

```tsx
<Navbar3 hero={true} />
```

When `hero={true}`:

- Navbar is positioned absolutely over the content below
- Typically used with dark backgrounds where `dark={true}` is also set

## Dropdown Close Behavior

Desktop dropdowns close when:

1. **Clicking the backdrop** - `PopoverBackdrop` covers the screen behind the dropdown
2. **Clicking a menu item** - `CloseButton as={Link}` closes the popover and navigates
3. **Pressing Escape** - Built-in Headless UI behavior

Mobile menu closes when:

1. **Clicking the backdrop** - Dialog backdrop click
2. **Clicking a navigation link** - `onClick={close}` on all links
3. **Pressing Escape** - Built-in Headless UI behavior

## Data Flow

All navigation data is centralized in `config.ts`. Components import directly from this file:

```
config.ts
├── homeLink → index.tsx, sticky-navbar.tsx
├── links → desktop-nav.tsx, mobile-nav.tsx
└── socialLinks → social-media-nav.tsx, mobile-nav.tsx
```

## Benefits of This Architecture

1. **Modularity**: Each component has a single responsibility
2. **Maintainability**: Easy to locate and modify specific features
3. **Centralized Config**: All navigation data in one place
4. **Type Safety**: Centralized types prevent inconsistencies
5. **Reusability**: Components can be reused in different contexts
6. **Readability**: Clear separation of concerns

## Making Changes

### Adding a new navigation link

Edit `config.ts` and add to the `links` array

### Adding a dropdown to a link

Add a `dropdown` property with `items`, optional `columns` (1-3), and optional `position` ('left', 'center', 'right')

### Modifying social links

Edit `config.ts` and update the `socialLinks` array

### Changing the logo link destination

Edit `homeLink` in `config.ts`

### Using dark mode

Pass `dark={true}` to the Navbar3 component for dark backgrounds

### Using hero mode

Pass `hero={true}` to position navbar absolutely over content

### Updating mobile menu behavior

Edit `mobile-nav.tsx` for the menu content or `mobile-nav-button.tsx` for the sidebar container
