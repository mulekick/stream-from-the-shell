# Use an official node.js runtime as a parent image
FROM node:lts-bullseye-slim

# update apt sources
RUN apt-get update && \
    # install ffmpeg
    apt-get install --no-install-recommends -m -y ffmpeg && \
    # install npm at the global scope
    npm cache clean --force && \
    npm i npm@latest -g && \
    # create /src directory and subdirectories
    mkdir -p /src/stream.queue

# bundle app source
COPY . /src/

# Set the working directory to /src
WORKDIR /src

# install modules
RUN npm install --omit=dev

# set env as production
ENV NODE_ENV=production

# start streaming as soon as container is up
CMD [ "node", "stream.generator/stream.js" ]