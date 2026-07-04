#!/bin/bash


docker run -it --rm \
    -v ./:/workspace \
    -p 8080:8080 \
    -w /workspace \
    golang:1.26.0-alpine3.23 \
    sh -c "/workspace/scripts/workspace/install-tools.sh && /workspace/scripts/workspace/initialize.sh && /bin/bash"