#!/bin/bash
set -u

LANDING_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"

if [ "${1:-}" != "--run" ]; then
  /usr/bin/osascript - "$LANDING_ROOT/start.command" "${PORT:-3000}" "${HOST:-127.0.0.1}" <<'APPLESCRIPT'
on run argv
  set launcher to item 1 of argv
  set serverPort to item 2 of argv
  set serverHost to item 3 of argv
  tell application "Terminal"
    activate
    do script "env PORT=" & quoted form of serverPort & " HOST=" & quoted form of serverHost & " /bin/bash " & quoted form of launcher & " --run"
  end tell
end run
APPLESCRIPT
  exit $?
fi

cd -- "$LANDING_ROOT" || exit 1
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '\nWelcome to Lesnoy!\nNode.js 22+ and npm are required. Install Node.js from https://nodejs.org\n'
  read -r -p "Press Enter to close… "
  exit 1
fi

node scripts/launch.cjs
LANDING_EXIT=$?
if [ "$LANDING_EXIT" -ne 0 ]; then
  read -r -p "Startup failed. Press Enter to close… "
fi
exit "$LANDING_EXIT"
