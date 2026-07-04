//go:generate mockgen -source=models.go -destination=mocks/runTrivy_mock.go -package=runTrivy_mock
package runTrivy

import commandRunner "comp7705/containerScanner/internal/commandRunner"

// RunTrivy interface for generating mocks
type RunTrivy interface {
	/*
		Runs the trivy command to scan the image for vulnerabilities.
		The image can be provided as a tar file or a docker image name.
		The scan output is in JSON format and is saved to the output file path.
		Returns the exit code of the trivy command and an error if any.
	*/
	RunTrivy_Image_JsonScan(imagePath string, outputFilePath string) (int, error)

	/*
		Runs the trivy command to scan the filesystem for vulnerabilities.
		The filesystem path is the path to the filesystem to scan.
		The scan output is in JSON format and is saved to the output file path.
		Returns the exit code of the trivy command and an error if any.
	*/
	RunTrivy_Filesystem_JsonScan(filesystemPath string, outputFilePath string) (int, error)
}

type PackageHelperFunctionCollection interface {
	NewRunTrivy(commandRunner commandRunner.CommandRunner) RunTrivy
}

func NewPackageHelperFunctionCollection() PackageHelperFunctionCollection {
	return &packageHelperFunctionCollection{}
}
