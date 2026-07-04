#!/bin/bash

echo "Generating all code (go generate ./...)"
go generate ./...
if [ $? -ne 0 ]; then
    echo "Failed to generate code"
    exit 1
fi
echo "Code generated"
exit 0