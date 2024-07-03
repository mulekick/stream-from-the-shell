#!/bin/bash

# origin stream master playlist url
streamlocation="$1"
# twitch.tv ingestion endpoint
endpoint="$(cat .twitch.endpoint)"

# ==== GENERAL ====
# overwrite outputs
# hide banner, disable interactive mode
# read source in real time (for streaming)

# ==== CODECS ====
# codecs : copy stream data without reencoding

# ==== OUTPUT ====
# use flv muxer for rtmp compatibility

if [[ -z "$streamlocation" ]]; then
  # failure
  echo "please provide a stream source to forward"
  exit 1
fi

ffmpeg -y \
  -hide_banner \
  -nostdin \
  -re \
  -err_detect +ignore_err+careful \
  -fflags +discardcorrupt \
  -strict +very+strict \
  -i "$streamlocation" \
  -map 0:a:0 \
  -map 0:v:0 \
  -c:a:0 copy \
  -c:v:0 copy \
  -f flv \
  "$endpoint"

# success
exit 0