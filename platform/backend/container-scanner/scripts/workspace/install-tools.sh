#!/bin/sh

apk add --no-cache bash
if [ $? -ne 0 ]; then
    echo "Failed to install bash"
    exit 1
fi

apk add --no-cache curl
if [ $? -ne 0 ]; then
    echo "Failed to install curl"
    exit 1
fi

apk add --no-cache git
if [ $? -ne 0 ]; then
    echo "Failed to install git"
    exit 1
fi

go install go.uber.org/mock/mockgen@v0.6.0
if [ $? -ne 0 ]; then
    echo "Failed to install mockgen (go.uber.org/mock)"
    exit 1
fi