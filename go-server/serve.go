package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	clickfix "github.com/ClickSolveMainTR/clickfix-sdks/go"
)

// serve exposes the identity endpoint for your front end and the webhook receiver.
func serve() error {
	identitySecret := env("CLICKFIX_IDENTITY_SECRET")
	webhookSecret := env("CLICKFIX_WEBHOOK_SECRET")
	mux := http.NewServeMux()

	// The signed-in user's identity for ClickFix("identify", ...) or the mobile bridge.
	mux.HandleFunc("GET /api/support-session", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(supportSession(identitySecret, currentUser()))
	})

	mux.Handle("POST /webhooks/clickfix", webhookHandler(webhookSecret))

	addr := "127.0.0.1:" + envOr("PORT", "3000")
	log.Printf("listening on http://%s", addr)
	return http.ListenAndServe(addr, mux)
}

type webhookPayload struct {
	ID         string          `json:"id"`
	Event      string          `json:"event"`
	Version    int             `json:"version"`
	OccurredAt time.Time       `json:"occurred_at"`
	Data       json.RawMessage `json:"data"`
}

// webhookHandler verifies ClickFix-Webhook-Signature over the raw body (HMAC-SHA256
// of "timestamp.body", five-minute window), answers 401 when it does not match,
// deduplicates on ClickFix-Webhook-Id and answers 200 once the event is stored.
func webhookHandler(secret string) http.Handler {
	var mu sync.Mutex
	seen := map[string]struct{}{} // stand-in for a durable store (keep ids for a day)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "body", http.StatusBadRequest)
			return
		}
		if err := clickfix.VerifyWebhook(secret, r.Header.Get("ClickFix-Webhook-Timestamp"),
			r.Header.Get("ClickFix-Webhook-Signature"), raw, time.Now(), 5*time.Minute); err != nil {
			http.Error(w, `{"error":"INVALID_SIGNATURE"}`, http.StatusUnauthorized)
			return
		}
		id := r.Header.Get("ClickFix-Webhook-Id")
		mu.Lock()
		_, dup := seen[id]
		if id != "" {
			seen[id] = struct{}{}
		}
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if dup {
			fmt.Fprint(w, `{"duplicate":true}`)
			return
		}
		var payload webhookPayload
		if err := json.Unmarshal(raw, &payload); err != nil {
			http.Error(w, "json", http.StatusBadRequest)
			return
		}
		// Act on payload.Event / payload.Data here (queue it in production), e.g.
		// message.sent carries conversation_uuid and contact_external_id for push notifications.
		log.Printf("received %s (%s) delivery %s", payload.Event, payload.OccurredAt.Format(time.RFC3339), id)
		fmt.Fprintf(w, `{"received":%q}`, payload.Event)
	})
}
