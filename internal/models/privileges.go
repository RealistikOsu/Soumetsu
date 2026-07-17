package models

import (
	"strconv"
	"strings"
)

// UserPrivileges represents the bitwise privilege flags for a user
type UserPrivileges int

// User privileges v2 - these are bitwise flags (see docs/reference/privileges.md)
const (
	UserPrivilegeActivated         UserPrivileges = 1
	UserPrivilegeDonor             UserPrivileges = 2
	AdminPrivilegeManageUsers      UserPrivileges = 4
	AdminPrivilegeViewRAPLogs      UserPrivileges = 8
	AdminPrivilegeManageReports    UserPrivileges = 16
	AdminPrivilegeManageClans      UserPrivileges = 32
	AdminPrivilegeSendAlerts       UserPrivileges = 64
	AdminPrivilegeManageSettings   UserPrivileges = 128
	AdminPrivilegeManageBadges     UserPrivileges = 256
	AdminPrivilegeManagePrivileges UserPrivileges = 512
	DevPrivilegeViewErrorLogs      UserPrivileges = 1024
	UserPrivilegeTournamentStaff   UserPrivileges = 2048
	UserPrivilegeBot               UserPrivileges = 4096
	BnPrivilegeStd                 UserPrivileges = 8192
	BnPrivilegeTaiko               UserPrivileges = 16384
	BnPrivilegeCtb                 UserPrivileges = 32768
	BnPrivilegeMania               UserPrivileges = 65536
)

var privilegeNames = map[UserPrivileges]string{
	UserPrivilegeActivated:         "Activated",
	UserPrivilegeDonor:             "Donor",
	AdminPrivilegeManageUsers:      "ManageUsers",
	AdminPrivilegeViewRAPLogs:      "ViewRAPLogs",
	AdminPrivilegeManageReports:    "ManageReports",
	AdminPrivilegeManageClans:      "ManageClans",
	AdminPrivilegeSendAlerts:       "SendAlerts",
	AdminPrivilegeManageSettings:   "ManageSettings",
	AdminPrivilegeManageBadges:     "ManageBadges",
	AdminPrivilegeManagePrivileges: "ManagePrivileges",
	DevPrivilegeViewErrorLogs:      "ViewErrorLogs",
	UserPrivilegeTournamentStaff:   "TournamentStaff",
	UserPrivilegeBot:               "Bot",
	BnPrivilegeStd:                 "BN(std)",
	BnPrivilegeTaiko:               "BN(taiko)",
	BnPrivilegeCtb:                 "BN(ctb)",
	BnPrivilegeMania:               "BN(mania)",
}

// String returns a human-readable string of the privileges
func (p UserPrivileges) String() string {
	if p == 0 {
		return "None"
	}

	var parts []string
	for priv, name := range privilegeNames {
		if p&priv != 0 {
			parts = append(parts, name)
		}
	}

	if len(parts) == 0 {
		return strconv.Itoa(int(p))
	}

	return strings.Join(parts, ", ")
}
