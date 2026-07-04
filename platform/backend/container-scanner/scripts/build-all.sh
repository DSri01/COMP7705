#!/bin/bash

buildCandidate=("hello-cli" "run-command" "scanner")
buildTargets=("linux/amd64" "linux/arm64" "darwin/amd64" "darwin/arm64" "windows/amd64" "windows/arm64")

echo "Cleaning bin directory"
rm -rf bin/*

for candidate in "${buildCandidate[@]}"; do
    echo "Building ($candidate) for all platforms"

    for target in "${buildTargets[@]}"; do
        export GOOS=${target%/*}
        export GOARCH=${target#*/}

        echo "Building $candidate for $GOOS/$GOARCH"

        if [ $GOOS = "windows" ]; then
            extension=".exe"
        else
            extension=""
        fi

        go build -o bin/$GOOS/$GOARCH/$candidate$extension cmd/$candidate/main.go
        if [ $? -ne 0 ]; then
            echo "Failed to build $candidate for $GOOS/$GOARCH"
            echo "Error: $?"
            echo "Exiting..."
            exit 1
        fi
    done

done