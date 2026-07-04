package main

import (
	"fmt"
	"os"

	commandRunner "comp7705/containerScanner/internal/commandRunner"
)

func printUsage() {
	fmt.Println("Usage: run-command <command> <args>")
}
func main() {
	// check if the number of arguments is correct
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	// get the command and arguments
	command := os.Args[1]

	args := []string{}
	if len(os.Args) > 2 {
		args = os.Args[2:]
	}

	// run the command
	exitCode, err := commandRunner.NewPackageHelperFunctionCollection().NewCommandRunner().RunCommand(command, args)
	if err != nil {
		fmt.Println("Error: ", err)
		os.Exit(1)
	}

	fmt.Println("Command exited with code: ", exitCode)
	os.Exit(exitCode)
}
