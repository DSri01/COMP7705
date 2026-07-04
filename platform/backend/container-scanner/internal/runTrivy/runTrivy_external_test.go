package runTrivy_test

import (
	"errors"
	"strings"
	"testing"

	commandRunner_mock "comp7705/containerScanner/internal/commandRunner/mocks"
	runTrivy "comp7705/containerScanner/internal/runTrivy"

	gomock "go.uber.org/mock/gomock"
)

// Tests for RunTrivy_Image_JsonScan

const testImagePath = "testdata/image.tar"
const testOutputPath = "testdata/output.json"
const testFilesystemPath = "testdata/filesystem"

var testTrivyArgs = []string{"image", "--input", testImagePath, "--format", "json", "--output", testOutputPath}
var testTrivyFsArgs = []string{"filesystem", testFilesystemPath, "--format", "json", "--output", testOutputPath}

type mockRunCommandResult struct {
	exitCode int
	err      error
}

func TestRunTrivy_Image_JsonScan(t *testing.T) {
	mockedCommandRunner := commandRunner_mock.NewMockCommandRunner(gomock.NewController(t))
	mockedCommandRunner.EXPECT().RunCommand("trivy", []string{"image", "--input", "testdata/image.tar", "--format", "json", "--output", "testdata/output.json"}).Return(0, nil)
	runTrivy := runTrivy.NewPackageHelperFunctionCollection().NewRunTrivy(mockedCommandRunner)
	exitCode, err := runTrivy.RunTrivy_Image_JsonScan("testdata/image.tar", "testdata/output.json")
	if err != nil {
		t.Errorf("RunTrivy_Image_JsonScan failed: %v", err)
	}
	if exitCode != 0 {
		t.Errorf("RunTrivy_Image_JsonScan failed: exit code %d", exitCode)
	}
}

func newSUT(t *testing.T, runCommandResult mockRunCommandResult) runTrivy.RunTrivy {
	t.Helper()
	mockedCommandRunner := commandRunner_mock.NewMockCommandRunner(gomock.NewController(t))
	mockedCommandRunner.EXPECT().
		RunCommand("trivy", testTrivyArgs).
		Return(runCommandResult.exitCode, runCommandResult.err)
	return runTrivy.NewPackageHelperFunctionCollection().NewRunTrivy(mockedCommandRunner)
}

func TestRunTrivy_Image_JsonScan_Success(t *testing.T) {
	sut := newSUT(t, mockRunCommandResult{exitCode: 0, err: nil})
	exitCode, err := sut.RunTrivy_Image_JsonScan(testImagePath, testOutputPath)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if exitCode != 0 {
		t.Errorf("exit code: got %d, want 0", exitCode)
	}
}

func TestRunTrivy_Image_JsonScan_NonZeroExitWithNoError(t *testing.T) {
	sut := newSUT(t, mockRunCommandResult{exitCode: 1, err: nil})
	exitCode, err := sut.RunTrivy_Image_JsonScan(testImagePath, testOutputPath)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if exitCode != 1 {
		t.Errorf("exit code: got %d, want 1", exitCode)
	}
}

func TestRunTrivy_Image_JsonScan_RunnerError_IsWrappedAndPropagated(t *testing.T) {
	sut := newSUT(t, mockRunCommandResult{exitCode: 2, err: errors.New("command not found")})
	exitCode, err := sut.RunTrivy_Image_JsonScan(testImagePath, testOutputPath)
	if err == nil {
		t.Fatal("expected an error but got nil")
	}
	if !strings.Contains(err.Error(), "runTrivy_Image_JsonScan failed") {
		t.Errorf("error %q does not contain wrap prefix", err.Error())
	}
	if exitCode != 2 {
		t.Errorf("exit code: got %d, want 2", exitCode)
	}
}

func TestRunTrivy_Image_JsonScan_RunnerError_OriginalMessageIsPreserved(t *testing.T) {
	sut := newSUT(t, mockRunCommandResult{exitCode: 1, err: errors.New("permission denied")})
	_, err := sut.RunTrivy_Image_JsonScan(testImagePath, testOutputPath)
	if err == nil {
		t.Fatal("expected an error but got nil")
	}
	if !strings.Contains(err.Error(), "permission denied") {
		t.Errorf("error %q does not contain original message", err.Error())
	}
}

// Tests for RunTrivy_Filesystem_JsonScan

func newFsSUT(t *testing.T, runCommandResult mockRunCommandResult) runTrivy.RunTrivy {
	t.Helper()
	mockedCommandRunner := commandRunner_mock.NewMockCommandRunner(gomock.NewController(t))
	mockedCommandRunner.EXPECT().
		RunCommand("trivy", testTrivyFsArgs).
		Return(runCommandResult.exitCode, runCommandResult.err)
	return runTrivy.NewPackageHelperFunctionCollection().NewRunTrivy(mockedCommandRunner)
}

func TestRunTrivy_Filesystem_JsonScan_Success(t *testing.T) {
	sut := newFsSUT(t, mockRunCommandResult{exitCode: 0, err: nil})
	exitCode, err := sut.RunTrivy_Filesystem_JsonScan(testFilesystemPath, testOutputPath)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if exitCode != 0 {
		t.Errorf("exit code: got %d, want 0", exitCode)
	}
}

func TestRunTrivy_Filesystem_JsonScan_NonZeroExitWithNoError(t *testing.T) {
	sut := newFsSUT(t, mockRunCommandResult{exitCode: 1, err: nil})
	exitCode, err := sut.RunTrivy_Filesystem_JsonScan(testFilesystemPath, testOutputPath)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if exitCode != 1 {
		t.Errorf("exit code: got %d, want 1", exitCode)
	}
}

func TestRunTrivy_Filesystem_JsonScan_RunnerError_IsWrappedAndPropagated(t *testing.T) {
	sut := newFsSUT(t, mockRunCommandResult{exitCode: 2, err: errors.New("command not found")})
	exitCode, err := sut.RunTrivy_Filesystem_JsonScan(testFilesystemPath, testOutputPath)
	if err == nil {
		t.Fatal("expected an error but got nil")
	}
	if !strings.Contains(err.Error(), "runTrivy_Filesystem_JsonScan failed") {
		t.Errorf("error %q does not contain wrap prefix", err.Error())
	}
	if exitCode != 2 {
		t.Errorf("exit code: got %d, want 2", exitCode)
	}
}

func TestRunTrivy_Filesystem_JsonScan_RunnerError_OriginalMessageIsPreserved(t *testing.T) {
	sut := newFsSUT(t, mockRunCommandResult{exitCode: 1, err: errors.New("permission denied")})
	_, err := sut.RunTrivy_Filesystem_JsonScan(testFilesystemPath, testOutputPath)
	if err == nil {
		t.Fatal("expected an error but got nil")
	}
	if !strings.Contains(err.Error(), "permission denied") {
		t.Errorf("error %q does not contain original message", err.Error())
	}
}
