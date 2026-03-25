# Workspace

## Overview

pnpm workspace monorepo using TypeScript. 会議室予約システム。

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TanStack Query, Tailwind CSS, shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── room-booking/       # React + Vite フロントエンド (会議室予約)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Features

### 会議室予約システム (artifacts/room-booking)
- 月ごとのカレンダービュー（縦軸: 日付×時間帯、横軸: 会議室1〜3）
- 時間帯: 1限(8:50-10:30), 2限(10:45-12:25), 3限(13:30-15:10), 4限(15:25-17:05), 17:30以降
- 空きセルをクリック → 氏名入力フォームで予約作成
- 予約済みセルをクリック → 削除確認ダイアログ
- 前月・次月ナビゲーション

### API Endpoints
- `GET /api/bookings?year=YYYY&month=M` - 予約一覧
- `POST /api/bookings` - 予約作成 { bookerName, date, timeSlot, roomId }
- `DELETE /api/bookings/:id` - 予約削除

## Database Schema

### bookings テーブル
- id: serial PRIMARY KEY
- booker_name: text NOT NULL
- date: date NOT NULL
- time_slot: text NOT NULL (slot1-slot5)
- room_id: integer NOT NULL (1-3)
- created_at: timestamp

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
