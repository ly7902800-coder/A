#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/mobile"

case "${1:-help}" in
  setup)
    flutter doctor -v || true
    flutter create --platforms=android,web .
    flutter pub get
    ;;
  get)
    flutter pub get
    ;;
  analyze)
    flutter analyze
    ;;
  test)
    flutter test
    ;;
  preview)
    flutter pub get
    exec flutter run -d web-server --web-hostname 0.0.0.0 --web-port 8080
    ;;
  apk)
    flutter pub get
    flutter build apk --release
    ;;
  aab)
    flutter pub get
    flutter build appbundle --release
    ;;
  clean)
    flutter clean
    flutter pub get
    ;;
  doctor)
    flutter doctor -v
    ;;
  help|*)
    cat <<'EOF'
Genesis AI Cloud Flutter IDE

Commands:
  ./tool/cloud_ide.sh setup     Prepare Android + Web targets
  ./tool/cloud_ide.sh get       Install packages
  ./tool/cloud_ide.sh analyze   Analyze Dart/Flutter code
  ./tool/cloud_ide.sh test      Run tests
  ./tool/cloud_ide.sh preview   Start browser preview on port 8080
  ./tool/cloud_ide.sh apk       Build release APK
  ./tool/cloud_ide.sh aab       Build release AAB
  ./tool/cloud_ide.sh clean     Clean Flutter build state
  ./tool/cloud_ide.sh doctor    Show Flutter environment diagnostics
EOF
    ;;
esac
