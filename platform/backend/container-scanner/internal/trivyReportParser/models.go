//go:generate mockgen -source=models.go -destination=mocks/trivyReportParser_mock.go -package=trivyReportParser_mock
package trivyReportParser

type TrivyReport struct {
	// ignored fields
	// SchemaVersion string   `json:"SchemaVersion"`
	// TrivyVersion  string   `json:"TrivyVersion"`
	// ReportID      string   `json:"ReportID"`
	// CreatedAt     string   `json:"CreatedAt"`
	// ArtifactName  string   `json:"ArtifactName"`
	// ArtifactType  string   `json:"ArtifactType"`
	Results []Result `json:"Results"`
}

type Result struct {
	Vulnerabilities []Vulnerability `json:"Vulnerabilities"`

	// ignored fields
	// Target string `json:"Target"`
	// Class string `json:"Class"`
	// Type string `json:"Type"`
	// Packages []Package `json:"Packages"`
}

// ignored fields
// type Package struct {
// 	ID string `json:"ID"`
// 	Name string `json:"Name"`
// 	Identifier Identifier `json:"Identifier"`
// 	Relationship string `json:"Relationship"`
// 	DependsOn []string `json:"DependsOn"`
// }

// type Identifier struct {
// 	PURL string `json:"PURL"`
// 	UID string `json:"UID"`
// }

type Vulnerability struct {
	VulnerabilityID string `json:"VulnerabilityID"`

	// ignored fields
	// VendorIDs       []string `json:"VendorIDs"`
	// PkgID           string `json:"PkgID"`
	// PkgName         string `json:"PkgName"`
	// PkgIdentifier   string `json:"PkgIdentifier"`
	// InstalledVersion string `json:"InstalledVersion"`
	// FixedVersion     string `json:"FixedVersion"`
}

type TrivyReportParser interface {
	ParseTrivyReport(fileData []byte) (TrivyReport, error)
}

type PackageHelperFunctionCollection interface {
	NewTrivyReportParser() TrivyReportParser
}

func NewPackageHelperFunctionCollection() PackageHelperFunctionCollection {
	return &packageHelperFunctionCollection{}
}
