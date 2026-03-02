# Event Command Dashboard

A real-time operations dashboard for live event management — built with React, TypeScript, and Vite.

## Tech Stack

- **Vite** — build tool and dev server
- **TypeScript** — typed throughout
- **React 18** — functional components with hooks
- **Tailwind CSS** — utility-first styling with custom design tokens
- **shadcn/ui** — Radix UI component library
- **Framer Motion** — animations
- **Recharts** — data visualisation
- **Zustand** — state management

## Getting Started

Requires Node.js and npm. Install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) if needed.

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate into the project
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Available Scripts

```sh
npm run dev        # Start dev server (localhost:8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run test       # Run tests (Vitest)
npm run test:watch # Watch mode tests
```

## Project Structure

```
src/
├── main.tsx                  # App entry point
├── App.tsx                   # Router and providers
├── index.css                 # Global styles and CSS variables
├── pages/
│   ├── Overview.tsx          # Organization overview
│   ├── Events.tsx            # Paginated events list
│   ├── EventDetail.tsx       # Event detail + edit flow
│   ├── Index.tsx             # Live event dashboard
│   └── NotFound.tsx          # 404 page
├── components/
│   ├── layout/               # Shared authenticated shell
│   ├── dashboard/            # Dashboard panel components
│   ├── overview/             # Overview page widgets
│   ├── auth/                 # Session and org guard UI
│   └── ui/                   # shadcn/ui component library
├── stores/
│   └── authStore.ts          # Session state + org context
├── hooks/
│   ├── useDashboardOverview.ts
│   ├── useEvents.ts
│   ├── useEventDetail.ts
│   ├── useLiveEventDashboard.ts
│   └── use-toast.ts
└── lib/
    ├── apiClient.ts
    ├── eventRouting.ts
    └── utils.ts
```

## Deployment

Build the project and deploy the `dist/` folder to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

```sh
npm run build
```

## Custom Domain

Configure your domain in your hosting provider's DNS settings and point it to your deployed project.
