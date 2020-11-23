#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

# Bump the version
NEW_VERSION=$(node scripts/version.js "$@")

# Build!
IS_RELEASE=1 run build
cp bundles/@yarnpkg/plugin-angular.js bin/@yarnpkg

# Add files to git
git add package.json bin/@yarnpkg

git commit -m "{chore} release $NEW_VERSION"
git tag "v$NEW_VERSION" -m "v$NEW_VERSION"
