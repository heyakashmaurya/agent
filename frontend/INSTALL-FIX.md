# Installation fix

The previous package.json contained an invalid @eslint/js range (`^10.1.0`).
Use this package.json instead.

PowerShell:

```powershell
cd frontend
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }
npm install
npm run build
```

If npm uses a stale cache, you can also run:

```powershell
npm cache verify
npm install
```
