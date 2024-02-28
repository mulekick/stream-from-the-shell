![GitHub package.json version](https://img.shields.io/github/package-json/v/mulekick/twitch.generator)
![GitHub License](https://img.shields.io/github/license/mulekick/twitch.generator)
![Last Commit](https://img.shields.io/github/last-commit/mulekick/twitch.generator)
![Docker Image Size](https://img.shields.io/docker/image-size/mulekick/twitch.generator)
![Docker Pulls](https://img.shields.io/docker/pulls/mulekick/twitch.generator)

## Prerequisites

   - Linux distro or WLS2 (debian 11 recommended)
   - GNU Bash shell (version 5.1.4 recommended)
   - Docker (version 24.0.6 recommended)
   - FFmpeg (version  4.3.6-0+deb11u1 recommended)
   - [FFmpeg provides officially supported packages for Debian, Ubuntu, Fedora and Red Hat](https://ffmpeg.org/download.html)

## 1 - Install

   - pick up a [twitch ingestion endpoint](https://help.twitch.tv/s/twitch-ingest-recommendation?language=en_US) near your location.
   - retrieve the [twitch stream key](https://help.twitch.tv/s/article/twitch-stream-key-faq?language=en_US) for your account.
   - run the following commands (replace the sample values by values you previously selected) :

```bash
# install ffmpeg if necessary (required for video sources preparation)
dpkg-query -l ffmpeg > /dev/null 2>&1 || sudo apt-get install ffmpeg

# clone the repository
git clone https://github.com/mulekick/twitch.generator

# cd into the cloned repository
cd twitch.generator

# create twitch endpoint file
echo "sample-twitch-ingestion-endpoint" > .twitch.endpoint

# create twitch stream key file
echo "sample-twitch-stream-key" > .twitch.streamkey

# create required directories
mkdir video.sources stream.queue

# create video sources file
touch video.sources/.video.sources.list

# pull docker image
docker image pull mulekick/twitch.generator:latest
```

## 2 - Select and prepare video sources

   - select some video files you intend to broadcast and write them to ```video.sources/.video.sources.list``` :

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

   - once done, run ```npm run prepare``` to format the video sources and make them ready for streaming.
   - you can alternatively run ```./utils/prepare.sources.sh``` in the event you don't have npm installed.
   - the processed video sources files will be saved in ```.flv``` format in ```video.sources```.
   - also, it is best to not store anything in the ```video.sources``` besides the sources list and the processed files.

## 3 - Start your twitch stream

   - you're all set up now, so run ```npm run start``` or ```./generator.sh start``` to start your twitch stream.
   - once the docker container is started, run ```npm run console``` or ```./generator.sh console```.
   - at this stage, you should see this :

![live streaming console](https://i.yourimageshare.com/8uYqrGLMye.webp)

## 4 - Broadcast your videos

   - congrats ! your twitch stream is now live and will loop 24/7 over the 40 available program slots.
   - from now on, any formatted video source file copy/pasted into ```stream.queue``` will be queued at the first available slot :

```bash
# IMPORTANT : COPY VIDEO SOURCE FILES INTO THE STREAM QUEUE ONE AT A TIME
# if you copy multiple files at once, only the first one will be added
cp "video.sources/season 1 episode 1.flv" stream.queue/.
# also, it is best to wait a few seconds between copies especially when working with large source files ...
cp "video.sources/season 1 episode 2.flv" stream.queue/.
# etc ...
cp "video.sources/season 1 episode 3.flv" stream.queue/.
# ...
```

   - each successfully queued file will show up in the streaming console with its slot number, start time, title and duration.
   - once the file has been transcoded into the outgoing stream, the slot it occupies is reset and becomes available again. 

## 5 - Once done, stop the stream

   - you can stop the stream at any point by running ```npm run stop``` or ```./generator.sh stop```.
   - also, I've heard that twitch automatically terminates streams once they reach the 48 hours mark (I'm unable to 100% confirm that though ...).
   - as a result, if the twitch ingestion process is terminated on their side the streaming container will exit and the stream will have to be restarted.