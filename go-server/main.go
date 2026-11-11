// ClickFix Go example: the server side of the integration guide with the
// github.com/ClickSolveMainTR/clickfix-sdks/go module.
//
//	go run . demo    # identity hashes, contact + company sync, custom fields, event, conversations (API calls)
//	go run . serve   # HTTP server: GET /api/support-session and the signed webhook receiver POST /webhooks/clickfix
package main

import (
	"context"
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run . demo | serve")
		os.Exit(2)
	}
	var err error
	switch os.Args[1] {
	case "demo":
		err = demo(context.Background())
	case "serve":
		err = serve()
	default:
		fmt.Fprintln(os.Stderr, "usage: go run . demo | serve")
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// env returns a required variable or exits with a readable message.
func env(name string) string {
	v := os.Getenv(name)
	if v == "" {
		fmt.Fprintf(os.Stderr, "%s is not set (see .env.example)\n", name)
		os.Exit(2)
	}
	return v
}

func envOr(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}
