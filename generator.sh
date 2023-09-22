#!/bin/bash

# app name
appname="twitch.generator"
# source directory
basedir=$(realpath .)
# GCP artefact registry
registry="$(cat docker.registry)"
# docker image tag
dockerimg="$registry/$appname:latest"
# container name
contname="stream-generator"
# stream queue bind mount
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

    zip -r "$2" package.json generator.sh docker.registry .twitch.endpoint .twitch.streamkey video.sources stream.queue utils

# -------------------------------------
# start process in containerized mode
elif [[ $1 = 'start' ]]; then

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
        --env TWITCH_STREAM_KEY="$(cat .twitch.streamkey)" \
        --network host \
        --name "$contname" \
        "$dockerimg"

# -------------------------------------
# stop container
elif [[ $1 = 'stop' ]]; then

    # send SIGINT to containers main processes
    # wait for 5 seconds before sending SIGKILL
    echo "---------------------------"
    echo "stopping container ..."
    docker container stop --signal=SIGINT -t 10 "$contname"

# -------------------------------------
# monitor container output
elif [[ $1 = "console" ]]; then

    # attach terminal to manager container
    docker attach --no-stdin --sig-proxy=false "$(docker container ls --filter=ancestor="$registry/$appname:latest" --format "{{.Names}}")"

# -------------------------------------
else
    echo "command directive not found"
    # failure
    exit 1
# -------------------------------------
fi

# success
exit 0