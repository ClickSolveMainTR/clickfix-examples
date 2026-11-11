package main

import (
	clickfix "github.com/ClickSolveMainTR/clickfix-sdks/go"
)

// AppUser is the signed-in user of your own system.
type AppUser struct {
	ID          string
	Name        string
	Email       string
	CompanyID   string // the company's id in your system; sent to the widget as company.id
	CompanyName string
}

// currentUser stands in for your authentication.
func currentUser() AppUser {
	return AppUser{ID: "1001", Name: "Ayşe Yılmaz", Email: "ayse@example.com", CompanyID: "F-77", CompanyName: "Acme A.Ş."}
}

// SupportSession is what the browser or app passes to ClickFix identify.
type SupportSession struct {
	UserID   string          `json:"user_id"`
	UserHash string          `json:"user_hash"`
	Name     string          `json:"name"`
	Email    string          `json:"email"`
	Company  *SessionCompany `json:"company,omitempty"`
}

type SessionCompany struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

// supportSession computes user_hash on the server. With a company the hash
// signs both ids (hex(HMAC-SHA256(secret, userID + "\n" + companyID))), so the
// widget binds the user to that company and nobody can claim another one.
// Without a company it is IdentityHash: hex(HMAC-SHA256(secret, userID)).
func supportSession(secret string, u AppUser) SupportSession {
	s := SupportSession{UserID: u.ID, Name: u.Name, Email: u.Email}
	if u.CompanyID != "" {
		s.UserHash = clickfix.IdentityCompanyHash(secret, u.ID, u.CompanyID)
		s.Company = &SessionCompany{ID: u.CompanyID, Name: u.CompanyName}
	} else {
		s.UserHash = clickfix.IdentityHash(secret, u.ID)
	}
	return s
}
