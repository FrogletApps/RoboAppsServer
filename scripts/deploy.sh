#!/usr/bin/env bash
set -e

ENV="test"
SKIP_BUILD=false
SKIP_TESTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    test|live)
      ENV="$1"
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
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

# Step 1: Server verification & build
if [ "$SKIP_BUILD" = false ]; then
  echo ">>> Step 1/2: Building & Verifying RoboApps Server..."
  if [ "$SKIP_TESTS" = true ]; then
    "$SCRIPT_DIR/build.sh" --skip-tests
  else
    "$SCRIPT_DIR/build.sh"
  fi
else
  echo ">>> Step 1/2: Skipping server build..."
fi

# Step 2: Cloudflare Worker deploy
echo -e "\n>>> Step 2/2: Deploying RoboApps Server Worker to Cloudflare ($ENV environment)..."
cd "$ROOT_DIR"
npx wrangler deploy --env "$ENV"
