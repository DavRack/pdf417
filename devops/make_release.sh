#!/bin/bash
source .env
PUBLIC_RELEASE_NAME=$(bash devops/get_release_name.sh)

npx sentry-cli releases new ${PUBLIC_RELEASE_NAME} --finalize
npx sentry-cli releases files ${PUBLIC_RELEASE_NAME} upload-sourcemaps ./build/_app/immutable/ --url-prefix "~/_app/immutable/"
