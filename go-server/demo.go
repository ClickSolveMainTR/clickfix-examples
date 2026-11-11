package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	clickfix "github.com/ClickSolveMainTR/clickfix-sdks/go"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// idempotencyKey names one logical write: the API replays the stored response
// for a repeated key, so retries are safe and a different input needs a new key.
func idempotencyKey(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])[:40]
}

// demo runs the guide's server-side steps in order and prints each result.
func demo(ctx context.Context) error {
	out := json.NewEncoder(os.Stdout)
	user := currentUser()

	// 1. Identity hashes (only the hash leaves the server).
	session := supportSession(env("CLICKFIX_IDENTITY_SECRET"), user)
	_ = out.Encode(map[string]any{"step": "support-session", "session": session})

	client, err := clickfix.New(envOr("CLICKFIX_BASE_URL", "https://api.getclickfix.com"), env("CLICKFIX_API_KEY"))
	if err != nil {
		return err
	}

	// 2. Company by its external id (the value the widget sends as company.id).
	var company *openapi_types.UUID
	companies, err := client.GetV1PublicApiCompaniesWithResponse(ctx, &clickfix.GetV1PublicApiCompaniesParams{ExternalId: &user.CompanyID})
	if err != nil {
		return err
	}
	if companies.StatusCode() != 200 {
		return apiError("GET /companies", companies.StatusCode(), companies.Body)
	}
	// The list envelope is untyped (IntegrationEnvelope.data is unknown); decode the page by hand.
	var page struct {
		Data struct {
			Items []struct {
				UUID openapi_types.UUID `json:"uuid"`
				Name string             `json:"name"`
			} `json:"items"`
			Total int `json:"total"`
		} `json:"data"`
	}
	if err := json.Unmarshal(companies.Body, &page); err != nil {
		return err
	}
	if len(page.Data.Items) > 0 {
		company = &page.Data.Items[0].UUID
	}
	_ = out.Encode(map[string]any{"step": "company", "found": len(page.Data.Items), "uuid": company})

	// 3. Contact by external id, linked to the company: 201 created, 200 updated.
	contact, err := client.PutV1PublicApiContactByExternalIdWithResponse(ctx,
		&clickfix.PutV1PublicApiContactByExternalIdParams{IdempotencyKey: idempotencyKey("contact", user.ID, user.Name, user.Email)},
		clickfix.PutV1PublicApiContactByExternalIdJSONRequestBody{ExternalId: user.ID, Name: &user.Name, Email: &user.Email, Company: company})
	if err != nil {
		return err
	}
	if contact.StatusCode() != 200 && contact.StatusCode() != 201 {
		return apiError("PUT /contacts/by-external-id", contact.StatusCode(), contact.Body)
	}
	_ = out.Encode(map[string]any{"step": "contact", "status": contact.StatusCode()})

	// 4. Custom fields on the same upsert; keys are the ones defined under Settings -> Custom fields.
	fields := map[string]any{"plan": "pro", "seats": 12, "renewal_date": "2027-01-31"}
	withFields, err := client.PutV1PublicApiContactByExternalIdWithResponse(ctx,
		&clickfix.PutV1PublicApiContactByExternalIdParams{IdempotencyKey: idempotencyKey("fields", user.ID, "pro", "12", "2027-01-31")},
		clickfix.PutV1PublicApiContactByExternalIdJSONRequestBody{ExternalId: user.ID, CustomFields: &fields})
	if err != nil {
		return err
	}
	if withFields.StatusCode() != 200 && withFields.StatusCode() != 201 {
		return apiError("PUT /contacts/by-external-id (custom_fields)", withFields.StatusCode(), withFields.Body)
	}
	_ = out.Encode(map[string]any{"step": "custom-fields", "status": withFields.StatusCode()})

	// 5. Product event on the company timeline (events:write). Your own event id
	// is the idempotency key, so a re-send is reported as duplicate.
	eventID := envOr("EVENT_ID", "seat-limit-F-77-2027-01")
	props := map[string]any{"seats": 12, "limit": 12}
	source := "api"
	event, err := client.PostV1PublicApiCompanyEventWithResponse(ctx,
		&clickfix.PostV1PublicApiCompanyEventParams{IdempotencyKey: eventID},
		clickfix.PostV1PublicApiCompanyEventJSONRequestBody{
			ExternalId: &user.CompanyID, ContactEmail: &user.Email, Name: "seat_limit_reached",
			Properties: &props, Source: &source, IdempotencyKey: &eventID,
		})
	if err != nil {
		return err
	}
	if event.StatusCode() != 200 && event.StatusCode() != 201 {
		return apiError("POST /company-events", event.StatusCode(), event.Body)
	}
	_ = out.Encode(map[string]any{"step": "event", "status": event.StatusCode(), "body": json.RawMessage(event.Body)})

	// 6. Conversations, page by page, with the SDK's offset iterator.
	type conversation struct {
		UUID    string `json:"uuid"`
		Status  string `json:"status"`
		Subject string `json:"subject"`
	}
	count := 0
	err = clickfix.Iterate(ctx,
		func(ctx context.Context, limit, offset int) (clickfix.Page[conversation], error) {
			return clickfix.ListPage[conversation](ctx, client, "conversations", limit, offset)
		},
		func(c conversation) bool { count++; return count < 100 })
	if err != nil {
		return err
	}
	_ = out.Encode(map[string]any{"step": "conversations", "listed": count})
	return nil
}

func apiError(call string, status int, body []byte) error {
	return fmt.Errorf("%s: HTTP %d %s", call, status, strings.TrimSpace(string(body)))
}
