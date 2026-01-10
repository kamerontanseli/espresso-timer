# Espresso Optimizer

A React-based espresso shot tracking and analysis app with a grunge/aesthetic design.

## Features

- **Shot Setup** - Configure single/double shots, grind settings, and calibration
- **Timer** - Track extraction time with visual progress indicator
- **Analysis** - Get feedback on your shot based on extraction time (25-30s ideal range)
- **History** - Log and review past shots

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

## Usage

1. **Initialize** - Select shot type, input test time/yield for calibration, set grind size
2. **Extract** - Start the timer when pulling your shot, stop when done
3. **Debrief** - Enter the actual output weight and run analysis
4. **Review** - See feedback on extraction speed and get recommendations for adjustments
