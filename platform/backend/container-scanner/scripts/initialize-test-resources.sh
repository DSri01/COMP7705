#!/bin/bash

# Initializes the test resources for the project.

if [ -d "__testResources__" ]; then
    echo "__testResources__ directory already exists"
else
    echo "__testResources__ directory does not exist, creating..."
    mkdir -p "__testResources__"
    if [ $? -ne 0 ]; then
        echo "Failed to create __testResources__ directory"
        exit 1
    fi
fi

if [ ! -d "__testResources__/container-images" ]; then
    echo "__testResources__/container-images directory does not exist, creating..."
    mkdir -p "__testResources__/container-images"
    if [ $? -ne 0 ]; then
        echo "Failed to create __testResources__/container-images directory"
        exit 1
    fi
fi

# create a test image tar file (alpine:3.23.3)

docker pull alpine:3.23.3
if [ $? -ne 0 ]; then
    echo "Failed to pull alpine:3.23.3 image"
    exit 1
fi

docker save -o "__testResources__/container-images/alpine_3.23.3.tar" alpine:3.23.3
if [ $? -ne 0 ]; then
    echo "Failed to save alpine:3.23.3 image to tar file"
    exit 1
fi