FROM --platform=amd64 node:20-alpine AS builder

ARG DOCKER_ENV
ENV NODE_ENV=${DOCKER_ENV}

WORKDIR /app
COPY ./ . 
RUN yarn install --frozen-lockfile \
  && yarn build

FROM --platform=amd64 node:20-alpine

ARG DOCKER_ENV
ENV NODE_ENV=${DOCKER_ENV}

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY ./yarn.lock . 

RUN yarn install --frozen-lockfile --production

ENTRYPOINT [ "node", "dist/server.js" ]

EXPOSE 3004
