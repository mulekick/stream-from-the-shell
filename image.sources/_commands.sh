#!/bin/bash

# app name
appname="twitch.generator"
# source directory
sourcedir=$(realpath .)
# GCP artefact registry
registry="$(cat ../docker.registry)"
# docker image tag
dockerimg="$registry/$appname:latest"

# -------------------------------------
if [[ ! -x "$sourcedir/$0" ]]; then
    echo "Please run this script from the source directory."
    exit 1      
# -------------------------------------
elif [[ ! -f "$sourcedir/Dockerfile" ]]; then
    echo "Dockerfile is missing"
    exit 1
# -------------------------------------
# start process in development mode
elif [[ $1 = "dev" ]]; then
    NODE_ENV=development \
    TWITCH_ENDPOINT="$(cat ../.twitch.endpoint)" \
    TWITCH_STREAM_KEY="$(cat ../.twitch.streamkey)" \
    node stream.generator/stream.js
# -------------------------------------
# build container
elif [[ $1 = "build" ]]; then
    # build docker image    
    docker build --no-cache -t "$dockerimg" .
# -------------------------------------
else
    echo "command directive not found"
    # failure
    exit 1
# -------------------------------------
fi

# success
exit 0