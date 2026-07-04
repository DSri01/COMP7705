package runTrivy

// runTrivyImpl is the implementation of the RunTrivy interface

import (
	commandRunner "comp7705/containerScanner/internal/commandRunner"
	"fmt"
)

type runTrivyImpl struct {
	commandRunner commandRunner.CommandRunner
}

func (r *runTrivyImpl) RunTrivy_Image_JsonScan(imagePath string, outputFilePath string) (int, error) {
	command := "trivy"
	args := []string{"image", "--input", imagePath, "--format", "json", "--output", outputFilePath}
	exitCode, err := r.commandRunner.RunCommand(command, args)
	if err != nil {
		return exitCode, fmt.Errorf("runTrivy_Image_JsonScan failed: %w", err)
	}
	return exitCode, nil
}

func (r *runTrivyImpl) RunTrivy_Filesystem_JsonScan(filesystemPath string, outputFilePath string) (int, error) {
	command := "trivy"
	args := []string{"filesystem", filesystemPath, "--format", "json", "--output", outputFilePath}
	exitCode, err := r.commandRunner.RunCommand(command, args)
	if err != nil {
		return exitCode, fmt.Errorf("runTrivy_Filesystem_JsonScan failed: %w", err)
	}
	return exitCode, nil
}

type packageHelperFunctionCollection struct{}

func (c *packageHelperFunctionCollection) NewRunTrivy(commandRunner commandRunner.CommandRunner) RunTrivy {
	return &runTrivyImpl{commandRunner: commandRunner}
}
