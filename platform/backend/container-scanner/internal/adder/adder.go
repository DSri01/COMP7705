package adder

// AdderImpl is the implementation of the Adder interface
type adderImpl struct {
	A int
	B int
}

func (a_ *adderImpl) SetA(a int) {
	a_.A = a
}

func (a_ *adderImpl) SetB(b int) {
	a_.B = b
}

func (a_ *adderImpl) GetA() int {
	return a_.A
}

func (a_ *adderImpl) GetB() int {
	return a_.B
}

/*
Adds two numbers
*/
func (a_ *adderImpl) Add() int {
	return a_.A + a_.B
}

type packageHelperFunctionCollection struct{}

func (c *packageHelperFunctionCollection) NewAdder() Adder {
	return &adderImpl{A: 0, B: 0}
}

func (c *packageHelperFunctionCollection) NewAdderWithA(A int) Adder {
	return &adderImpl{A: A, B: 0}
}

func (c *packageHelperFunctionCollection) NewAdderWithB(B int) Adder {
	return &adderImpl{A: 0, B: B}
}

func (c *packageHelperFunctionCollection) NewAdderWithAAndB(A int, B int) Adder {
	return &adderImpl{A: A, B: B}
}