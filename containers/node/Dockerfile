FROM node:10.14

RUN apt-get update && \
  apt-get install -y libav-tools \
  && apt-get clean
RUN npm install forever -g
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
RUN npm install
