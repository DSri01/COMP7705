package trivyReportParser

import "encoding/json"

type trivyReportParserImpl struct {
}

func (p *trivyReportParserImpl) ParseTrivyReport(fileData []byte) (TrivyReport, error) {
	report := TrivyReport{}
	err := json.Unmarshal(fileData, &report)
	if err != nil {
		return TrivyReport{}, err
	}
	return report, nil
}

type packageHelperFunctionCollection struct{}

func (c *packageHelperFunctionCollection) NewTrivyReportParser() TrivyReportParser {
	return &trivyReportParserImpl{}
}
