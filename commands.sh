#!/bin/bash

# source directory
basedir=$(realpath .)
# GCP artefact registry
registry="$(cat docker.registry)"
# app name
appname="stream-from-the-shell"
# docker image tag
dockerimg="$registry/$appname:latest"
# container name
contname="$(cat .container.name)"
# container bind mount for stream queue
hostqueuedir=$(realpath stream.queue)
contqueuedir='/src/stream.queue'

# -------------------------------------
# double check directory
if [[ ! -x "$basedir/$0" ]]; then
    echo "Please run this script from the base directory."
    exit 1   

# -------------------------------------
# bundle file system (excluding sources) for deployment on cloud server
elif [[ $1 = 'bundle' ]]; then

    # double check output file
    if [[ -z "$2" ]]; then
        echo "please provide a path for the bundle file"
        exit 1
    fi

    echo "----------------"
    echo "bundling files"

    zip -r "$2" package.json commands.sh docker.registry .container.name .twitch.endpoint video.sources stream.queue utils

# -------------------------------------
# start process in containerized mode
elif [[ $1 = 'stream' ]]; then

    # double check container name
    if [[ ! "$contname" =~ ^[A-Za-z0-9-]+$ ]]; then
        echo "please provide a name for the streaming container (lower / uppercase letters, numbers and dashes)"
        exit 1
    fi

    echo "---------------------------"
    echo "starting container ..."

    # disposable, allocate tty to get colors support in terminal, detach
    # acknowledge SIGINT as main process exit signal
    # mount stream queueing directory from host into container
    docker container run \
        --rm -t -d \
        --stop-signal=SIGINT \
        --mount "type=bind,source=$hostqueuedir,target=$contqueuedir,ro=false" \
        --env TWITCH_ENDPOINT="$(cat .twitch.endpoint)" \
        --network host \
        --name "$contname" \
        "$dockerimg"

# -------------------------------------
# start process in containerized mode
elif [[ $1 = 'restream' ]]; then

    echo "---------------------------"
    echo "starting container ..."

    # disposable, allocate tty to get colors support in terminal, detach
    # acknowledge SIGINT as main process exit signal
    # mount stream queueing directory from host into container
    docker container run \
        --rm -t -d \
        --stop-signal=SIGINT \
        --env TWITCH_ENDPOINT="$(cat .twitch.endpoint)" \
        --network host \
        --name "$contname" \
        "$dockerimg" \
        --restream "$2"

# -------------------------------------
# stop container
elif [[ $1 = 'stop' ]]; then

    # send SIGINT to container main process
    # wait for 10 seconds before sending SIGKILL
    echo "---------------------------"
    echo "stopping container ..."
    docker container stop \
        --signal=SIGINT \
        -t 10 \
        "$contname"

# -------------------------------------
# monitor container output
elif [[ $1 = "console" ]]; then

    # attach terminal to container stdout
    docker container attach \
        --no-stdin \
        --sig-proxy=false \
        "$contname"

# -------------------------------------
else
    echo "command directive not found"
    # failure
    exit 1
# -------------------------------------
fi

# success
exit 0