package adder

import "testing"

/*
Whitebox tests for the adder package.
*/

// TestAdderImpl_Add tests the Add method using direct struct access (whitebox testing)
func TestAdderImpl_Add(t *testing.T) {
	if (&adderImpl{A: 1, B: 2}).Add() != 3 {
		t.Errorf("1 + 2 = %d; want 3", (&adderImpl{A: 1, B: 2}).Add())
	}
}

// TestNewAdder tests the default constructor
func TestNewAdder(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdder()
	if adder.Add() != 0 {
		t.Errorf("0 + 0 = %d; want 0", adder.Add())
	}
}

// TestNewAdderWithA tests the constructor with A parameter
func TestNewAdderWithA(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdderWithA(1)
	if adder.Add() != 1 {
		t.Errorf("1 + 0 = %d; want 1", adder.Add())
	}
}

// TestNewAdderWithB tests the constructor with B parameter
func TestNewAdderWithB(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdderWithB(2)
	if adder.Add() != 2 {
		t.Errorf("0 + 2 = %d; want 2", adder.Add())
	}
}

// TestNewAdderWithAAndB tests the constructor with both A and B parameters
func TestNewAdderWithAAndB(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdderWithAAndB(1, 2)
	if adder.Add() != 3 {
		t.Errorf("1 + 2 = %d; want 3", adder.Add())
	}
}

// TestAdder_SetA tests the SetA method
func TestAdder_SetA(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdder()
	adder.SetA(1)
	if adder.GetA() != 1 {
		t.Errorf("Expected A to be 1, got %d", adder.GetA())
	}
}

// TestAdder_SetB tests the SetB method
func TestAdder_SetB(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdder()
	adder.SetB(2)
	if adder.GetB() != 2 {
		t.Errorf("Expected B to be 2, got %d", adder.GetB())
	}
}

// TestAdder_GetA tests the GetA method
func TestAdder_GetA(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdderWithA(5)
	if adder.GetA() != 5 {
		t.Errorf("Expected A to be 5, got %d", adder.GetA())
	}
}

// TestAdder_GetB tests the GetB method
func TestAdder_GetB(t *testing.T) {
	adder := NewPackageHelperFunctionCollection().NewAdderWithB(7)
	if adder.GetB() != 7 {
		t.Errorf("Expected B to be 7, got %d", adder.GetB())
	}
}