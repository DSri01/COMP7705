package scanServerRouter

import (
	runTrivy "comp7705/containerScanner/internal/runTrivy"
	trivyReportParser "comp7705/containerScanner/internal/trivyReportParser"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	gin "github.com/gin-gonic/gin"
)

type FileReader interface {
	ReadFile(path string) ([]byte, error)
}

type ScanRequest struct {
	ContainerFileName            string `json:"containerFileName" binding:"required"`
	JsonScanReportOutputFileName string `json:"jsonScanReportOutputFileName" binding:"required"`
}

type ScanResponse struct {
	Status           string   `json:"status"`
	VulnerabilityIDs []string `json:"vulnerabilityIDs"`
}

type ErrorResponse struct {
	Message string `json:"message"`
}

func extractVulnerabilityIDs(report trivyReportParser.TrivyReport) []string {
	ids := []string{}
	for _, result := range report.Results {
		for _, vuln := range result.Vulnerabilities {
			ids = append(ids, vuln.VulnerabilityID)
		}
	}
	return ids
}

func buildContainerImage_Tar_Json_ScanHandler(runTrivy runTrivy.RunTrivy, parser trivyReportParser.TrivyReportParser, fileReader FileReader, containerImagesDir string, outputJsonDir string) gin.HandlerFunc {
	return func(c *gin.Context) {

		// parsing the request body
		var req ScanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Bad Request"})
			c.Error(err)
			return
		}

		// validating the request body
		if !strings.HasSuffix(req.ContainerFileName, ".tar") {
			c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Bad Request"})
			c.Error(fmt.Errorf("Container file name must end with .tar (got: %s)", req.ContainerFileName))
			return
		}

		if !strings.HasSuffix(req.JsonScanReportOutputFileName, ".json") {
			c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Bad Request"})
			c.Error(fmt.Errorf("Json scan report output file name must end with .json (got: %s)", req.JsonScanReportOutputFileName))
			return
		}

		containerFilePath := filepath.Join(containerImagesDir, req.ContainerFileName)
		jsonScanReportOutputFilePath := filepath.Join(outputJsonDir, req.JsonScanReportOutputFileName)

		// running the scan
		exitCode, err := runTrivy.RunTrivy_Image_JsonScan(containerFilePath, jsonScanReportOutputFilePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Internal Server Error"})
			c.Error(fmt.Errorf("exit code: (%d) (%s)", exitCode, err.Error()))
			return
		}

		// reading the scan report
		fileData, err := fileReader.ReadFile(jsonScanReportOutputFilePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Internal Server Error"})
			c.Error(fmt.Errorf("failed to read scan report: %s", err.Error()))
			return
		}

		// parsing the scan report
		report, err := parser.ParseTrivyReport(fileData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Internal Server Error"})
			c.Error(fmt.Errorf("failed to parse scan report: %s", err.Error()))
			return
		}

		c.JSON(http.StatusOK, ScanResponse{
			Status:           "ok",
			VulnerabilityIDs: extractVulnerabilityIDs(report),
		})
	}
}

func buildGinLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		line := fmt.Sprintf("[%s] %s %s - %d (%s)",
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency)
		if param.ErrorMessage != "" {
			line += " | " + param.ErrorMessage
		}
		return line + "\n"
	})
}

func NewScanServerRouter(runTrivy runTrivy.RunTrivy, parser trivyReportParser.TrivyReportParser, fileReader FileReader, containerImagesDir string, outputJsonDir string) *gin.Engine {
	router := gin.New()
	router.Use(buildGinLogger())
	router.Use(gin.Recovery())
	router.POST("/container/tar/json/scan", buildContainerImage_Tar_Json_ScanHandler(runTrivy, parser, fileReader, containerImagesDir, outputJsonDir))
	return router
}
