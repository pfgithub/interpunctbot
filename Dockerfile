FROM node:16.9

WORKDIR /bot
COPY . /bot/
RUN corepack enable
RUN yarn install
RUN yarn knex migrate:latest
RUN yarn tsc
RUN echo hello

CMD ["yarn", "knex", "migrate:latest"]
CMD ["yarn", "tsc"]
CMD ["node", "built"]
