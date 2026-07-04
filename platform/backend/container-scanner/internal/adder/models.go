//go:generate mockgen -source=models.go -destination=mocks/adder_mock.go -package=adder_mock
package adder

// Adder interface for generating mocks
type Adder interface {
	SetA(a int)
	SetB(b int)
	GetA() int
	GetB() int
	Add() int
}

type PackageHelperFunctionCollection interface {
	NewAdder() Adder
	NewAdderWithA(A int) Adder
	NewAdderWithB(B int) Adder
	NewAdderWithAAndB(A int, B int) Adder
}

func NewPackageHelperFunctionCollection() PackageHelperFunctionCollection {
	return &packageHelperFunctionCollection{}
}