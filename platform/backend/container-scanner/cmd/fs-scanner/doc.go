/*
Scans the filesystem for vulnerabilities using Trivy.
Takes the input and output directory path as a command line arguments.
The input directory path should contain the codebase to scan.
If the output directory path does not exist, it will be created.
The program generates 2 files in the output directory path:
1. `scan.fs.json`: A JSON scan report using trivy.
2. `vulnerabilities.json`: A JSON file containing the vulnerabilities extracted from the scan report.

Usage:

fs-scanner <input-directory-path> <output-directory-path>
*/
package main
