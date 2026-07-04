//go:generate mockgen -source=models.go -destination=mocks/commandRunner_mock.go -package=commandRunner_mock
package commandRunner

// CommandRunner interface for generating mocks
type CommandRunner interface {

	// Runs the command and returns the exit code and error if any
	RunCommand(command string, args []string) (int, error)
}

type PackageHelperFunctionCollection interface {
	NewCommandRunner() CommandRunner
}

func NewPackageHelperFunctionCollection() PackageHelperFunctionCollection {
	return &packageHelperFunctionCollection{}
}
