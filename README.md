# Times Table Hero

An interactive multiplication learning game designed for children to practice and master times tables from 0 to 12.

## Features

- **Three Difficulty Levels**
  - Easy: Multiple choice with clearly different options
  - Medium: Multiple choice with closer options
  - Hard: Type the answer directly

- **Two Game Modes**
  - Practice Mode: Answer a set number of questions at your own pace
  - Timed Mode: Race against the clock to answer as many as possible

- **Progress Tracking**
  - Tracks your best scores locally
  - Shows improvement between sessions
  - Detailed results breakdown after each game

- **Kid-Friendly Design**
  - Colorful, engaging interface
  - Encouraging feedback messages
  - Responsive design for tablets and phones

## Tech Stack

- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [React Router](https://reactrouter.com/) - Navigation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/joaovl/times-table-hero.git

# Navigate to the project
cd times-table-hero

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── game/           # Game-specific components
│   │   ├── GamePlay.tsx
│   │   ├── GameResults.tsx
│   │   └── GameSetup.tsx
│   └── ui/             # Reusable UI components
├── lib/
│   ├── gameLogic.ts    # Game mechanics and question generation
│   ├── gameStorage.ts  # Local storage for progress
│   └── utils.ts        # Utility functions
├── hooks/              # Custom React hooks
├── pages/              # Route pages
└── App.tsx             # Main application
```

## Deployment

### Cloudflare Pages

1. Push your code to GitHub
2. Connect your repository in Cloudflare Pages dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy

### Other Platforms

The production build (`npm run build`) generates static files in the `dist/` folder that can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
