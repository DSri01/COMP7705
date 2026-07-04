/*
Blackbox tests for the adder package.
*/
package adder_test

import (
	libadder "comp7705/containerScanner/internal/adder"
	"testing"
)

// TestAdder_DefaultConstructor tests the default constructor behavior
func TestAdder_DefaultConstructor(t *testing.T) {
	adder := libadder.NewPackageHelperFunctionCollection().NewAdder()
	if adder.Add() != 0 {
		t.Errorf("0 + 0 = %d; want 0", adder.Add())
	}
}

// TestAdder_ConstructorWithA tests constructor with A parameter
func TestAdder_ConstructorWithA(t *testing.T) {
	adder := libadder.NewPackageHelperFunctionCollection().NewAdderWithA(5)
	if adder.Add() != 5 {
		t.Errorf("5 + 0 = %d; want 5", adder.Add())
	}
}

// TestAdder_ConstructorWithB tests constructor with B parameter
func TestAdder_ConstructorWithB(t *testing.T) {
	adder := libadder.NewPackageHelperFunctionCollection().NewAdderWithB(3)
	if adder.Add() != 3 {
		t.Errorf("0 + 3 = %d; want 3", adder.Add())
	}
}

// TestAdder_ConstructorWithAAndB tests constructor with both A and B parameters
func TestAdder_ConstructorWithAAndB(t *testing.T) {
	adder := libadder.NewPackageHelperFunctionCollection().NewAdderWithAAndB(4, 6)
	if adder.Add() != 10 {
		t.Errorf("4 + 6 = %d; want 10", adder.Add())
	}
}

// TestAdder_SettersAndGetters tests the setter and getter methods
func TestAdder_SettersAndGetters(t *testing.T) {
	adder := libadder.NewPackageHelperFunctionCollection().NewAdder()

	adder.SetA(7)
	if adder.GetA() != 7 {
		t.Errorf("Expected A to be 7, got %d", adder.GetA())
	}

	adder.SetB(8)
	if adder.GetB() != 8 {
		t.Errorf("Expected B to be 8, got %d", adder.GetB())
	}

	if adder.Add() != 15 {
		t.Errorf("7 + 8 = %d; want 15", adder.Add())
	}
}