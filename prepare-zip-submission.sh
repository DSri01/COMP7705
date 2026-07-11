#!/bin/bash

set -euo pipefail

outputFile=msp25025.zip

if [ -e $outputFile ]; then
    rm $outputFile
    if [ $? -ne 0 ]; then
        echo "Error: Failed to remove existing zip file"
        exit 1
    fi
fi

zip -r $outputFile .gitignore * \
    -x "$outputFile" \
    -x ".git/*" \
    -x "*/node_modules/*"
if [ $? -ne 0 ]; then
    echo "Error: Failed to create zip file"
    exit 1
fi

echo "Zip file created successfully"