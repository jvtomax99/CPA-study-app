#!/bin/sh
# Noto Sans JP (SIL Open Font License 1.1, Google Fonts) for the Japanese render's titles and subtitles.
# Taken from the npm package @expo-google-fonts/noto-sans-jp, which ships the full TTFs; only the 700 and 900
# weights are used. Not committed (5.7 MB each): run once before `npm run render:ja`. Run in promo/.
set -e
tmp=$(mktemp -d)
(cd "$tmp" && npm pack --silent @expo-google-fonts/noto-sans-jp@0.4.4 >/dev/null && tar xzf ./*.tgz)
cp "$tmp/package/700Bold/NotoSansJP_700Bold.ttf" "$tmp/package/900Black/NotoSansJP_900Black.ttf" public/fonts/
rm -rf "$tmp"
ls -la public/fonts/NotoSansJP_*.ttf
