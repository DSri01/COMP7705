package scanServerRouter_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	scanServerRouter "comp7705/containerScanner/internal/scanServerRouter"
	runTrivy_mock "comp7705/containerScanner/internal/runTrivy/mocks"
	trivyReportParser "comp7705/containerScanner/internal/trivyReportParser"
	trivyReportParser_mock "comp7705/containerScanner/internal/trivyReportParser/mocks"

	"github.com/gin-gonic/gin"
	"go.uber.org/mock/gomock"
)

const (
	testContainerImagesDir = "/images"
	testOutputJsonDir      = "/output"
	scanRoute              = "/container/tar/json/scan"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// stubFileReader is a simple test double for scanServerRouter.FileReader.
type stubFileReader struct {
	data []byte
	err  error
}

func (s *stubFileReader) ReadFile(_ string) ([]byte, error) {
	return s.data, s.err
}

func newSUT(t *testing.T, mockRunTrivy *runTrivy_mock.MockRunTrivy, mockParser *trivyReportParser_mock.MockTrivyReportParser, fileReader scanServerRouter.FileReader) *gin.Engine {
	t.Helper()
	return scanServerRouter.NewScanServerRouter(mockRunTrivy, mockParser, fileReader, testContainerImagesDir, testOutputJsonDir)
}

func doRequest(router *gin.Engine, body any) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	json.NewEncoder(&buf).Encode(body)
	req, _ := http.NewRequest(http.MethodPost, scanRoute, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// --- invalid / malformed body ---

func TestScanHandler_MalformedBody_Returns400(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)

	req, _ := http.NewRequest(http.MethodPost, scanRoute, bytes.NewBufferString("not-json{{{"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	newSUT(t, mockTrivy, mockParser, &stubFileReader{}).ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestScanHandler_MissingRequiredFields_Returns400(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)

	w := doRequest(newSUT(t, mockTrivy, mockParser, &stubFileReader{}), map[string]string{})
	if w.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// --- field validation ---

func TestScanHandler_ContainerFileName_NotTar_Returns400(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)

	w := doRequest(newSUT(t, mockTrivy, mockParser, &stubFileReader{}), scanServerRouter.ScanRequest{
		ContainerFileName:            "image.zip",
		JsonScanReportOutputFileName: "report.json",
	})
	if w.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestScanHandler_OutputFileName_NotJson_Returns400(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)

	w := doRequest(newSUT(t, mockTrivy, mockParser, &stubFileReader{}), scanServerRouter.ScanRequest{
		ContainerFileName:            "image.tar",
		JsonScanReportOutputFileName: "report.txt",
	})
	if w.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// --- RunTrivy interaction ---

func TestScanHandler_TrivyError_Returns500(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)
	mockTrivy.EXPECT().
		RunTrivy_Image_JsonScan("/images/image.tar", "/output/report.json").
		Return(1, errors.New("trivy failed"))

	w := doRequest(newSUT(t, mockTrivy, mockParser, &stubFileReader{}), scanServerRouter.ScanRequest{
		ContainerFileName:            "image.tar",
		JsonScanReportOutputFileName: "report.json",
	})
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func TestScanHandler_Success_Returns200WithVulnerabilityIDs(t *testing.T) {
	ctrl := gomock.NewController(t)
	mockTrivy := runTrivy_mock.NewMockRunTrivy(ctrl)
	mockParser := trivyReportParser_mock.NewMockTrivyReportParser(ctrl)

	mockTrivy.EXPECT().
		RunTrivy_Image_JsonScan("/images/image.tar", "/output/report.json").
		Return(0, nil)

	reportJSON := []byte(`{"Results":[{"Vulnerabilities":[{"VulnerabilityID":"CVE-2021-1234"},{"VulnerabilityID":"CVE-2022-5678"}]}]}`)
	fileReader := &stubFileReader{data: reportJSON}

	mockParser.EXPECT().
		ParseTrivyReport(reportJSON).
		Return(trivyReportParser.TrivyReport{
			Results: []trivyReportParser.Result{
				{
					Vulnerabilities: []trivyReportParser.Vulnerability{
						{VulnerabilityID: "CVE-2021-1234"},
						{VulnerabilityID: "CVE-2022-5678"},
					},
				},
			},
		}, nil)

	w := doRequest(newSUT(t, mockTrivy, mockParser, fileReader), scanServerRouter.ScanRequest{
		ContainerFileName:            "image.tar",
		JsonScanReportOutputFileName: "report.json",
	})

	if w.Code != http.StatusOK {
		t.Errorf("status: got %d, want %d", w.Code, http.StatusOK)
	}

	var resp scanServerRouter.ScanResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Status != "ok" {
		t.Errorf("status field: got %q, want %q", resp.Status, "ok")
	}

	wantIDs := []string{"CVE-2021-1234", "CVE-2022-5678"}
	if len(resp.VulnerabilityIDs) != len(wantIDs) {
		t.Fatalf("vulnerabilityIDs length: got %d, want %d", len(resp.VulnerabilityIDs), len(wantIDs))
	}
	for i, id := range wantIDs {
		if resp.VulnerabilityIDs[i] != id {
			t.Errorf("vulnerabilityIDs[%d]: got %q, want %q", i, resp.VulnerabilityIDs[i], id)
		}
	}
}
