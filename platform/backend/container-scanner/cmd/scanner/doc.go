/*
Runs a scanner server that scans software for vulnerabilities.
The configurations are loaded from the environment variables:

1. PORT: The port to listen on.
2. IMAGE_TAR_DIRECTORY_PATH: The directory to scan container images from.
3. JSON_OUTPUT_DIRECTORY_PATH: The directory to save the JSON scan reports to.

Usage:

scanner
*/
package main
