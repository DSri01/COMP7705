#!/bin/bash

# check if the go.mod file exists
if [ -f "go.mod" ]; then
    echo "go.mod file already exists"
else
    echo "go.mod file does not exist, initializing..."
    go mod init comp7705/containerScanner
    if [ $? -ne 0 ]; then
        echo "Failed to initialize go.mod file"
        exit 1
    fi
fi

echo "Running go mod tidy..."
go mod tidy
if [ $? -ne 0 ]; then
    echo "Failed to run go mod tidy"
    exit 1
fi

echo "Running go mod verify..."
go mod verify
if [ $? -ne 0 ]; then
    echo "Failed to run go mod verify"
    exit 1
fi

echo "Running go generate ./..."
go generate ./...
if [ $? -ne 0 ]; then
    echo "Failed to generate mocks"
    exit 1
fi

# echo "Running go mod vendor..."
# go mod vendor

echo "Initialization complete"