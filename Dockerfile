FROM node:10.13.0-alpine

# Create Directory for the Container
WORKDIR /usr/src/app
# Only copy the package.json file to work directory

# Install tsc
RUN npm install tsc -g

# Install typescript
RUN npm install typescript -g

COPY package.json .
# Install all Packages
RUN npm install
# Copy all other source code to work directory
ADD . /usr/src/app
# TypeScript
RUN tsc
# Start
CMD [ "npm", "start" ]