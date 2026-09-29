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

# Keep the repository as a normal Flutter project while adding the cloud targets.
flutter create --platforms=android,web --project-name genesis_ai --org com.genesisai .
flutter pub get

cd ../..
chmod +x tool/cloud_ide.sh || true

echo
echo "=============================================="
echo " Genesis AI - Flutter Cloud IDE is ready"
echo "=============================================="
echo "Preview:  ./tool/cloud_ide.sh preview"
echo "Analyze:  ./tool/cloud_ide.sh analyze"
echo "Tests:    ./tool/cloud_ide.sh test"
echo "APK:      ./tool/cloud_ide.sh apk"
echo "AAB:      ./tool/cloud_ide.sh aab"
echo "Doctor:   ./tool/cloud_ide.sh doctor"
echo
echo "Codespaces Preview: forward port 8080"
echo "Android Emulator: use a local/device target or CI build;"
echo "Codespaces does not provide a full nested Android emulator."
