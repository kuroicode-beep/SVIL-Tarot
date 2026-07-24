@echo off
cd /d "C:\Projects\SVIL-Tarot"
if /I "dev"=="preview" (
  call npm run build
  start "" http://127.0.0.1:4173/
  call npm run preview -- --host 127.0.0.1 --port 4173
) else (
  start "" http://127.0.0.1:5173/
  call npm run dev -- --host 127.0.0.1 --port 5173
)
