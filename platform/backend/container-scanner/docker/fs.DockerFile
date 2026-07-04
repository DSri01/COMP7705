FROM golang:1.26.0-alpine3.23 AS s0builder

WORKDIR /app

COPY __testResources__ __testResources__
COPY cmd cmd
COPY internal internal
COPY scripts scripts
COPY go.mod go.mod
COPY go.sum go.sum

RUN go mod tidy
RUN go mod verify
RUN go install go.uber.org/mock/mockgen@v0.6.0
RUN go generate ./...
RUN go test -cover ./...

RUN go build -o fs-scanner cmd/fs-scanner/main.go

FROM aquasec/trivy:0.69.1 AS s1runtime

WORKDIR /app

COPY --from=s0Builder /app/fs-scanner /app/fs-scanner

RUN mkdir -p /code-directory

CMD ["/code-directory", "/code-directory/.scans"]

ENTRYPOINT ["/app/fs-scanner"]