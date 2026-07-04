package main

import (
	"fmt"
	"os"
	"strconv"

	adder "comp7705/containerScanner/internal/adder"
)

func printUsage() {
	fmt.Println("Usage: hello-cli <number1> <number2>")
}

func main() {

	// check if the number of arguments is correct
	if len(os.Args) != 3 {
		printUsage()
		os.Exit(1)
	}

	// convert the first argument to an integer
	number1, err := strconv.Atoi(os.Args[1])
	if err != nil {
		fmt.Println("Error: Invalid number1")
		os.Exit(1)
	}

	// convert the second argument to an integer
	number2, err := strconv.Atoi(os.Args[2])
	if err != nil {
		fmt.Println("Error: Invalid number2")
		os.Exit(1)
	}

	// create a new adder with the two numbers
	adder := adder.NewPackageHelperFunctionCollection().NewAdderWithAAndB(number1, number2)

	fmt.Println("Hello, World!")
	fmt.Println("The sum of the two numbers is:", adder.Add())
}
