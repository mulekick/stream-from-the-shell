# Use an official node.js runtime as a parent image
FROM node:lts-bookworm-slim

# update apt sources
RUN apt-get update && \
    # install ffmpeg
    apt-get install --no-install-recommends -m -y ffmpeg && \
    # install npm at the global scope (no need to install curl with apt since there is no web server ...)
    npm cache clean --force && \
    npm i npm@latest -g && \
    # create /src directory and subdirectories
    mkdir -p /src/stream.queue /src/scripts /src/stream.slots

# bundle app source (docker only copies directory contents ...)
COPY package.json package-lock.json dist/main.js default.slot.flv /src/
COPY scripts /src/scripts/
COPY stream.slots /src/stream.slots/

# Set the working directory to /src
WORKDIR /src

# clean install modules
RUN npm ci --omit=dev

# set env as production
ENV NODE_ENV=production

# set default executable
ENTRYPOINT [ "node", "main.js" ]

# set default parameters
CMD [ "--stream" ]