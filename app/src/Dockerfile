FROM node:10.14

RUN npm install forever -g
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
RUN npm install
