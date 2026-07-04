#!/bin/bash

# Uses trivy to scan the code for vulnerabilities.

docker run --rm \
    -v ./:/code-directory \
    aquasec/trivy:0.69.1 \
    filesystem /code-directory --format json --output /code-directory/.scans/trivy.fs.json
if [ $? -ne 0 ]; then
    echo "error: failed to scan the code with Trivy"
    exit 1
fi