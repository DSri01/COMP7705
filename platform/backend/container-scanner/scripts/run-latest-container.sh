#!/bin/bash

docker run --rm -it -p 8080:8080 -v ./__testResources__/container-images:/fs comp7705containerscanner:latest