#!/bin/bash

echo "Running all tests"

go test -cover ./...
if [ $? -ne 0 ]; then
    echo "Tests failed"
    exit 1
fi
echo "Tests ran successfully"
exit 0