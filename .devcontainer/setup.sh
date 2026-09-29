#!/usr/bin/env bash
set -euo pipefail

cd "${CODESPACE_VSCODE_FOLDER:-/workspaces/A}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter SDK was not found in the Codespaces image."
  exit 1
fi

flutter --version
flutter doctor -v || true

cd apps/mobile

if [ ! -d android ]; then
  flutter create --platforms=android --project-name genesis_ai --org com.genesisai .
fi

flutter pub get

echo
echo "Genesis AI Flutter environment is ready."
echo "Run: flutter analyze"
echo "Run: flutter test"
echo "Run: flutter run -d chrome"
echo "Build APK: flutter build apk --release"
echo "Build AAB: flutter build appbundle --release"
