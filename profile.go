package main

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// profileData contains minimal data needed for the client-side profile
type profileData struct {
	baseTemplateData
	UserID    string // Can be ID or username - resolved client-side
	IsNumeric bool   // Whether the param looks like a user ID
}

func userProfile(c *gin.Context) {
	data := new(profileData)
	data.UserID = c.Param("user")

	// Check if it's a numeric ID or username
	_, err := strconv.Atoi(data.UserID)
	data.IsNumeric = err == nil

	data.TitleBar = "Profile"
	data.DisableHH = true

	resp(c, 200, "profile.html", data)
}
