# Container Scanner & FS Scanner

This directory contains the prototype implementation of the container scanner and file system scanner.
`golang` (version `1.26.0`) was used for the implementation.

The `container scanner` build target exposes an `HTTP` server and
scans the specified container `.tar` archive with
[`trivy`](https://trivy.dev/).
It expects that the `.tar` archive is present in the local file system
within a configured path.

The `file system` build target scans the input directory (containing the code)
using [`trivy`](https://trivy.dev/).
It parses the report to extract the `CVE` IDs found in the report.

## Known Issues

1. Please note that the code invokes the trivy scanner via `execCommand`
and the user input goes as the argument.
This may potentially allow path traversal attacks as the user input is not properly santized.
This is a known vulnerability in the project which is not planned to be addressed
as this code will not serve real users and will only serve as a component in this academic project.
It is assumed that the requests come from trusted users.