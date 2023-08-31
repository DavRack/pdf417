#!/bin/bash
source .env

APP_NAME=$(node -p "require('./package.json').name")
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "${APP_NAME}-${COMMIT_HASH}-${PUBLIC_SENTRY_ENV}"
