#!/bin/sh
# Finish the render for the app: voice levelled to -16 LUFS, 720 x 1280 H.264 small enough for the web,
# moov atom up front so it starts playing at once, and a poster frame.
# Run in promo/ after `npm run render`: sh tools/finish.sh   (Japanese: after `npm run render:ja`, sh tools/finish.sh -ja)
set -e
n="how-to-use$1"
ffmpeg -loglevel error -y -i out/$n.mp4 \
  -vf scale=720:-2:flags=lanczos -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 96k -ar 48000 \
  -movflags +faststart ../media/$n.mp4
ffmpeg -loglevel error -y -ss 3 -i out/$n.mp4 -frames:v 1 -vf scale=540:-2 -q:v 4 ../media/$n.jpg
ls -la ../media/$n.mp4 ../media/$n.jpg
