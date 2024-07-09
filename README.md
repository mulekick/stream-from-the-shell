![GitHub package.json version](https://img.shields.io/github/package-json/v/mulekick/stream-from-the-shell)
![GitHub License](https://img.shields.io/github/license/mulekick/stream-from-the-shell)
![Last Commit](https://img.shields.io/github/last-commit/mulekick/stream-from-the-shell)
![Docker Image Size](https://img.shields.io/docker/image-size/mulekick/stream-from-the-shell)
![Docker Pulls](https://img.shields.io/docker/pulls/mulekick/stream-from-the-shell)

# Stream on twitch.tv from the shell

**_Important : make sure that whatever you're streaming is compliant with twitch.tv's [terms of service](https://www.twitch.tv/p/en/legal/terms-of-service/) and [community guidelines](https://safety.twitch.tv/s/article/Community-Guidelines?language=en_US)._**

## Prerequisites

- Linux distro or WLS2 (debian 12 recommended)
- GNU Bash shell (version 5.2.15 recommended)
- Docker (version 27.0.2 recommended)
- FFmpeg (version  5.1.5-0+deb12u1 recommended)
- [FFmpeg provides officially supported packages for Debian, Ubuntu, Fedora and Red Hat](https://ffmpeg.org/download.html)

## 1 - Install the program

- Get the [twitch.tv stream key](https://help.twitch.tv/s/article/twitch-stream-key-faq?language=en_US) for your account.
- Select up a [twitch.tv ingestion endpoint](https://help.twitch.tv/s/twitch-ingest-recommendation?language=en_US) near your location.
- Run the following commands :

```bash
# install ffmpeg if necessary (required for video sources preparation)
dpkg-query -l ffmpeg > /dev/null 2>&1 || sudo apt-get install ffmpeg

# clone the repository
git clone https://github.com/mulekick/stream-from-the-shell

# cd into the cloned repository
cd stream-from-the-shell

# create container name configuration file (lower / uppercase letters, numbers and dashes allowed)
echo "STREAMING_CONTAINER_SAMPLE_NAME" > .container.name

# create endpoint configuration file (append your stream key to whatever URL you selected)
echo "rtmp://{TWITCH_ENDPOINT_ID}.contribute.live-video.net/app/{YOUR_STREAM_KEY}" > .twitch.endpoint

# pull the docker image
docker image pull mulekick/stream-from-the-shell:latest
```

## 2 - Prepare videos to stream

- Select some videos you want to broadcast and add them to ```video.sources/.video.sources.list``` :

```bash
# sample .video.sources.list file (all containers formats, resolutions, framerates etc ... are permitted)
# you can write comments into this file as well using the bash syntax
# always use absolute paths and enclose in single quotes as in the following examples :
'/home/myusername/video files/series/breaking bad season 1/season 1 episode 1.mp4'
'/home/myusername/video files/series/breaking bad season 1/season 1 episode 2.mp4'
'/home/myusername/video files/series/breaking bad season 1/season 1 episode 3.mp4'
# etc ...
# IMPORTANT NOTE : FILE PATHS MUST NOT CONTAIN SINGLE QUOTES, RENAME IF NECESSARY 
```

- Once done, run ```npm run prepare``` to format your videos sources and ready them up for streaming.
- You can run ```./utils/prepare.sources.sh``` to the same effect if you don't have npm installed.
- **_Formatted_** video files will be saved in ```.flv``` format in ```video.sources```.

**_Note : It is best to not store anything in ```video.sources``` besides the sources list and the processed files._**

## 3 - Stream on twitch.tv from the shell

- You're all set up now, so run ```npm run stream``` or ```./commands.sh stream``` to start your twitch.tv stream.
- Once the docker container has started, run ```npm run console``` or ```./commands.sh console```.
- At this stage, the streaming console should show on your TTY and display the 40 program slots :

![live streaming console](https://i.yourimageshare.com/9qxQtl0lLg.PNG)

## 4 - Broadcast your videos on stream

- Congrats ! Your stream is now live on twitch.tv and will loop 24/7 over the 40 available program slots.
- Any **_formatted_** video file copied to ```stream.queue``` will be queued to be broadcasted on stream.
- Each queued file will show up in the TTY console with its slot number, start time, title and duration.

```bash
# IMPORTANT : COPY FORMATTED VIDEO FILES TO THE STREAM QUEUE ONE AT A TIME
# if you copy multiple files at once, only the first one will be added
cp "video.sources/beaking_bad_season_1_episode_1.flv" stream.queue/.
# IMPORTANT : ALWAYS WAIT FOR THE COPIED VIDEO TO APPEAR IN THE CONSOLE BEFORE COPYING THE NEXT ONE
# it is even better to wait a few seconds between copy operations, especially when working with large videos
cp "video.sources/beaking_bad_season_1_episode_2.flv" stream.queue/.
# etc ...
cp "video.sources/beaking_bad_season_1_episode_3.flv" stream.queue/.
# ...
```

- Once the video has been transcoded into the outgoing stream, its slot is reset and becomes available again. 

## 5 - Restream an ongoing stream

- You can also use the program to restream an ongoing live stream by typing the following command :

```bash
# pass the url to the master playlist of the live stream you want to restream
npm run restream "https://video.website/live-stream-master-playlist.m3u8"

# if you don't have npm installed
./commands.sh restream "https://video.website/live-stream-master-playlist.m3u8"
```

## 5 - Once done, stop the stream

- The stream can be stopped at any point by running ```npm run stop``` or ```./commands.sh stop```.
- Twitch.tv may automatically terminate the stream after 48 hours (I'm unable to 100% confirm that).
- As a result, if twitch.tv terminates the stream, the streaming container will exit and have to be restarted.