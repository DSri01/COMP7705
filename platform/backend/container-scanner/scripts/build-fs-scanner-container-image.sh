#!/bin/bash

if [ $# = 0 ]; then
    docker build --network=host -f docker/fs.DockerFile -t comp7705fsscanner:latest .
    if [ $? -ne 0 ]; then
        echo "Failed to build comp7705fsscanner:latest image"
        exit 1
    fi
    exit 0
elif [ $# = 1 ]; then
    docker build --network=host -f docker/fs.DockerFile -t comp7705fsscanner:latest -t comp7705fsscanner:$1 .
    if [ $? -ne 0 ]; then
        echo "Failed to build comp7705fsscanner:$1 image"
        exit 1
    fi
    exit 0
elif [ $# = 2 ]; then
    docker build --network=host -f docker/fs.DockerFile -t $1:latest -t $1:$2 .
    if [ $? -ne 0 ]; then
        echo "Failed to build comp7705fsscanner: $1:$2 image"
        exit 1
    fi
    exit 0
else
    echo "Usage:"
    echo "\t$0"
    echo "\t$0 <tag-version>"
    echo "\t$0 <image-name> <tag-version>"
    exit 1
fi