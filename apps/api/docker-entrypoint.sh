#!/bin/sh
set -e
cd /app/apps/api
pnpm exec prisma migrate deploy
if [ "${RUN_SEED:-false}" = "true" ]; then
  pnpm exec prisma db seed || true
fi
exec node dist/src/main.js
