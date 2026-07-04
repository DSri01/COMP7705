package main

import (
	commandRunner "comp7705/containerScanner/internal/commandRunner"
	runTrivy "comp7705/containerScanner/internal/runTrivy"
	scanServerRouter "comp7705/containerScanner/internal/scanServerRouter"
	trivyReportParser "comp7705/containerScanner/internal/trivyReportParser"
	"log"
	"os"

	godotenv "github.com/joho/godotenv"
)

type osFileReader struct{}

func (osFileReader) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func pathIsDirectory(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

type Config struct {
	Port               string
	ContainerImagesDir string
	OutputJsonDir      string
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}

func loadConfig(envFilePath string) Config {

	err := godotenv.Load(envFilePath)
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	port := mustGetEnv("PORT")
	containerImagesDir := mustGetEnv("IMAGE_TAR_DIRECTORY_PATH")
	outputJsonDir := mustGetEnv("JSON_OUTPUT_DIRECTORY_PATH")

	if !pathExists(containerImagesDir) {
		log.Fatalf("IMAGE_TAR_DIRECTORY_PATH does not exist (path: %s)", containerImagesDir)
	}
	if !pathIsDirectory(containerImagesDir) {
		log.Fatalf("IMAGE_TAR_DIRECTORY_PATH is not a directory (path: %s)", containerImagesDir)
	}
	if !pathExists(outputJsonDir) {
		log.Fatalf("JSON_OUTPUT_DIRECTORY_PATH does not exist (path: %s)", outputJsonDir)
	}
	if !pathIsDirectory(outputJsonDir) {
		log.Fatalf("JSON_OUTPUT_DIRECTORY_PATH is not a directory (path: %s)", outputJsonDir)
	}

	return Config{
		Port:               port,
		ContainerImagesDir: containerImagesDir,
		OutputJsonDir:      outputJsonDir,
	}
}

func main() {
	// load the configurations from the environment variables

	config := loadConfig(".env")

	commandRunner := commandRunner.NewPackageHelperFunctionCollection().NewCommandRunner()

	runTrivy := runTrivy.NewPackageHelperFunctionCollection().NewRunTrivy(commandRunner)

	parser := trivyReportParser.NewPackageHelperFunctionCollection().NewTrivyReportParser()

	// start the scanner server
	router := scanServerRouter.NewScanServerRouter(runTrivy, parser, osFileReader{}, config.ContainerImagesDir, config.OutputJsonDir)
	router.Run(":" + config.Port)
}
