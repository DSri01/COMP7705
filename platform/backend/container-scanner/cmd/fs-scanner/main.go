package main

import (
	"fmt"
	"os"
	"path/filepath"

	commandRunner "comp7705/containerScanner/internal/commandRunner"
	runTrivy "comp7705/containerScanner/internal/runTrivy"
	trivyReportParser "comp7705/containerScanner/internal/trivyReportParser"
	"encoding/json"
)

func printUsage() {
	fmt.Println("Usage: fs-scanner <input-directory-path> <output-directory-path>")
}

type Config struct {
	InputDirectoryPath  string
	OutputDirectoryPath string
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func pathIsDirectory(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func loadConfig() Config {
	if len(os.Args) != 3 {
		printUsage()
		os.Exit(1)
	}

	inputDirectoryPath := os.Args[1]
	outputDirectoryPath := os.Args[2]

	if !pathExists(inputDirectoryPath) {
		fmt.Printf("Input directory path does not exist: %s\n", inputDirectoryPath)
		os.Exit(1)
	}

	if !pathIsDirectory(inputDirectoryPath) {
		fmt.Printf("Input directory path is not a directory: %s\n", inputDirectoryPath)
		os.Exit(1)
	}

	if !pathExists(outputDirectoryPath) {
		err := os.MkdirAll(outputDirectoryPath, 0755)
		if err != nil {
			fmt.Printf("Error creating output directory: %s\n", err)
			os.Exit(1)
		}
	}

	return Config{
		InputDirectoryPath:  inputDirectoryPath,
		OutputDirectoryPath: outputDirectoryPath,
	}
}

type Vulnerabilities struct {
	VulnerabilityIDs []string `json:"VulnerabilityIDs"`
}

func main() {
	config := loadConfig()

	commandRunner := commandRunner.NewPackageHelperFunctionCollection().NewCommandRunner()

	runTrivy := runTrivy.NewPackageHelperFunctionCollection().NewRunTrivy(commandRunner)

	outputFilePath := filepath.Join(config.OutputDirectoryPath, "scan.fs.json")

	exitCode, err := runTrivy.RunTrivy_Filesystem_JsonScan(config.InputDirectoryPath, outputFilePath)
	if err != nil {
		fmt.Printf("Error running Trivy: %s\n", err)
		os.Exit(1)
	}

	// TODO: extract the vulnerabilities from the scan report

	fileData, err := os.ReadFile(outputFilePath)
	if err != nil {
		fmt.Printf("Error reading scan report: %s\n", err)
		os.Exit(1)
	}

	trivyReportParser := trivyReportParser.NewPackageHelperFunctionCollection().NewTrivyReportParser()

	report, err := trivyReportParser.ParseTrivyReport(fileData)
	if err != nil {
		fmt.Printf("Error parsing scan report: %s\n", err)
		os.Exit(1)
	}

	// create a new file for the vulnerabilities
	vulnerabilitiesFilePath := filepath.Join(config.OutputDirectoryPath, "vulnerabilities.json")
	err = os.WriteFile(vulnerabilitiesFilePath, []byte(""), 0644)
	if err != nil {
		fmt.Printf("Error creating vulnerabilities file: %s\n", err)
		os.Exit(1)
	}

	vulnerabilities := Vulnerabilities{}

	for _, result := range report.Results {
		for _, vulnerability := range result.Vulnerabilities {
			vulnerabilities.VulnerabilityIDs = append(vulnerabilities.VulnerabilityIDs, vulnerability.VulnerabilityID)
		}
	}

	vulnerabilitiesJSON, err := json.Marshal(vulnerabilities)
	if err != nil {
		fmt.Printf("Error marshalling vulnerabilities: %s\n", err)
		os.Exit(1)
	}

	// write the vulnerabilities to the file
	err = os.WriteFile(vulnerabilitiesFilePath, vulnerabilitiesJSON, 0644)
	if err != nil {
		fmt.Printf("Error writing vulnerabilities to file: %s\n", err)
		os.Exit(1)
	}

	fmt.Printf("Trivy exited with code: %d\n", exitCode)
	os.Exit(exitCode)
}
