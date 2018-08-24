FROM ubuntu:18.04

WORKDIR /app

COPY ./packages/gnarly-bin/pkg/ .
RUN chmod +x -R .

# keep this up to date with the output from pkg -_-
COPY ./node_modules/sha3/build/Release/sha3.node .
COPY ./node_modules/scrypt/build/Release/scrypt.node .
COPY ./node_modules/websocket/build/Release/bufferutil.node .
COPY ./node_modules/websocket/build/Release/validation.node .

ENTRYPOINT [ "./gnarly-bin-linux" ]
