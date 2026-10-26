#!/bin/sh
# Builds the minified copy for release in release/ (macOS/Linux version of release.ps1)
# Needs: npm install -g terser clean-css-cli html-minifier-terser
set -e
rm -rf release
mkdir -p release/css release/js

# JavaScript: remove spaces and comments, shorten local names
for file in js/*.js; do
  terser "$file" --compress --mangle -o "release/$file"
done

# CSS
cleancss -o release/css/style.css css/style.css

# HTML pages
for page in *.html; do
  html-minifier-terser "$page" --collapse-whitespace --collapse-boolean-attributes --remove-comments -o "release/$page"
done

# Files that are already small: copy them as they are
cp -R images vendor release/

echo "Done. Serve it with: http-server release -p 8081"
