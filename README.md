# Kotha Studio

Draw a room to scale, stand inside it in 3D, and hand over a buildable plan.

Kotha Studio is a capstone project for the Gritfeat Solution internship. The product sells the
**blueprint and a 3D preview** of the space. It does not sell furniture, and it does not upload or
host images.

## Repository layout

```
kotha-studio/
  client/            React 19 + Vite + TypeScript front end
  server/            Express 4 + TypeScript + Mongoose API
  packages/shared/   Zod schemas and shared types
proposal/            Proposal sources, figures and build scripts
Kotha_Studio_Project_Proposal.docx / .pdf
Kotha_Studio_Presentation.pptx
TODO.txt             Delivery checklist
TOMORROW_PLAN.txt    Working notes and next tasks
```

## What is built

- Marketing site with a crafted intro, dark mode and a moving hero specimen loop.
- Auth screens for client, designer and admin roles. Admin accounts are issued with a provisioning
  code; there are no demo accounts.
- Studio workspace and per-project blueprint editor:
  - 100 mm grid, 15° snapping, two-point calibration
  - walls, rooms, stairs, doors, windows, furniture
  - join/trim walls, live dimensions, layers, undo/redo
  - multi-floor plans, stacked 3D preview, material estimate
  - SVG / PDF / CSV / JSON export
- 3D preview built from the same millimetre values as the plan.

## Run locally

```bash
cd kotha-studio
npm install
npm run dev -w @kotha/client     # http://localhost:5173
```

The API needs MongoDB and a `.env` file. Copy `kotha-studio/.env.example` to
`kotha-studio/.env` and fill in the secrets, then:

```bash
npm run dev -w @kotha/server     # http://localhost:4000
```

## Build

```bash
npm run typecheck -w @kotha/client
npm run build -w @kotha/client
npm run typecheck -w @kotha/server
```

## Documents

The proposal is written for **Prajwal Basnet**, supervised by **Abiral Khadka** at
**Gritfeat Solution**. The submission deadline is **7 December 2026**; the delivery timeline runs
through **13 December 2026**.
