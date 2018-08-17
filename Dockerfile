FROM node:carbon-wheezy
LABEL maintainer="gabriele.decapoa@gmail.com"

WORKDIR /usr/src/app
# Update libraries with security exposure
RUN apt-get clean && apt-get update -qqy \
  && apt-get upgrade -y openssl curl && apt-get clean \\
  && rm -rf /var/lib/apt/lists/*

# Bundle app source
COPY . /usr/src/app
RUN npm install --production

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

USER node

CMD [ "node", "app.js" ]