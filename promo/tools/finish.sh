#!/bin/sh
# Finish the render for the app: voice levelled to -16 LUFS, H.264 small enough for the web,
# moov atom up front so it starts playing at once, and a poster frame.
# Run in promo/ after `npm run render`: sh tools/finish.sh
set -e
ffmpeg -loglevel error -y -i out/how-to-use.mp4 \
  -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -tune stillimage \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 96k -ar 48000 \
  -movflags +faststart ../media/how-to-use.mp4
ffmpeg -loglevel error -y -ss 3 -i out/how-to-use.mp4 -frames:v 1 -vf scale=540:-2 -q:v 4 ../media/how-to-use.jpg
ls -la ../media/how-to-use.mp4 ../media/how-to-use.jpg
