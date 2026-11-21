#!/usr/bin/env bash
set -e

SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "========================================"
echo " Building RoboApps Server"
echo "========================================"

cd "$ROOT_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing server dependencies (npm install)..."
  npm install
fi

echo -e "\n>>> Step 1/3: Running TypeScript typecheck..."
npm run typecheck

if [ "$SKIP_TESTS" = false ]; then
  echo -e "\n>>> Step 2/3: Running test suite..."
  npm test
else
  echo -e "\n>>> Step 2/3: Skipping tests..."
fi

echo -e "\n>>> Step 3/3: Compiling Node.js bundle (tsc)..."
npm run build:node

echo -e "\n>>> RoboApps Server build completed successfully."
