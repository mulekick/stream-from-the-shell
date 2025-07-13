# syntax=docker/dockerfile:1.4

# Use an official node.js runtime as a parent image
FROM node:22.15.0-bookworm-slim as base

# create /dist directory and subdirectories
RUN mkdir -p /dist/stream.queue /dist/scripts /dist/stream.slots

# bundle app source 
COPY package.json package-lock.json dist/main.js default.slot.flv /dist/
COPY scripts /dist/scripts/
COPY stream.slots /dist/stream.slots/

# set working directory
WORKDIR /dist

# clean install modules
RUN npm ci --omit=dev

# build actual runtime
FROM node:22.15.0-bookworm-slim

# install ffmpeg
RUN apt-get update && apt-get install --no-install-recommends -m -y ffmpeg

# copy from base
COPY --from=base /dist/. /dist/

# set working directory
WORKDIR /dist

# set env as production
ENV NODE_ENV=production

# set default executable
ENTRYPOINT [ "node", "main.js" ]

# set default parameters
CMD [ "--stream" ]