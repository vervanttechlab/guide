# Builds the minified copy for release in release\ (Windows PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File release.ps1
# Needs: npm install -g terser clean-css-cli html-minifier-terser
$ErrorActionPreference = 'Stop'
if (Test-Path release) { Remove-Item -Recurse -Force release }
New-Item -ItemType Directory -Force release\css, release\js | Out-Null

# JavaScript: remove spaces and comments, shorten local names
foreach ($file in Get-ChildItem js\*.js) {
  terser "js\$($file.Name)" --compress --mangle -o "release\js\$($file.Name)"
}

# CSS
cleancss -o release\css\style.css css\style.css

# HTML pages
foreach ($page in Get-ChildItem *.html) {
  html-minifier-terser $page.Name --collapse-whitespace --collapse-boolean-attributes --remove-comments -o "release\$($page.Name)"
}

# Files that are already small: copy them as they are
Copy-Item -Recurse images, vendor release\

Write-Host "Done. Serve it with: http-server release -p 8081"
