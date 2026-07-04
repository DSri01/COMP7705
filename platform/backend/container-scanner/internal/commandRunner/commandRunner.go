package commandRunner

import (
	"os"
	"os/exec"
)

// commandRunnerImpl is the implementation of the CommandRunner interface
type commandRunnerImpl struct{}

func (c *commandRunnerImpl) RunCommand(command string, args []string) (int, error) {
	// prepare the command for execution
	cmd := exec.Command(command, args...)

	// attach the standard output and standard error to the command
	// this allows the command to write to the standard output and standard error
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// execute the command
	// waits for the command to complete
	err := cmd.Run()
	exitCode := 0

	// checking if the command ran successfully
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			// if the err is an exit error, get the exit code
			exitCode = exitError.ExitCode()
		}
		return exitCode, err
	}

	// exit code is 0 (command completed successfully)
	return 0, nil
}

type packageHelperFunctionCollection struct{}

func (c *packageHelperFunctionCollection) NewCommandRunner() CommandRunner {
	return &commandRunnerImpl{}
}
