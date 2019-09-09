FROM node:12.10

RUN apt-get update && apt-get install -y build-essential python
RUN npm install forever -g
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
RUN npm install
