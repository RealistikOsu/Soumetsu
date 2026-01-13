package models

import (
	"strconv"
	"strings"
)

// UserPrivileges represents the bitwise privilege flags for a user
type UserPrivileges int

// User privileges - these are bitwise flags
const (
	UserPrivilegePublic              UserPrivileges = 1
	UserPrivilegeNormal              UserPrivileges = 2 << 0  // 2
	UserPrivilegeDonor               UserPrivileges = 2 << 1  // 4
	AdminPrivilegeAccessRAP          UserPrivileges = 2 << 2  // 8
	AdminPrivilegeManageUsers        UserPrivileges = 2 << 3  // 16
	AdminPrivilegeBanUsers           UserPrivileges = 2 << 4  // 32
	AdminPrivilegeSilenceUsers       UserPrivileges = 2 << 5  // 64
	AdminPrivilegeWipeUsers          UserPrivileges = 2 << 6  // 128
	AdminPrivilegeManageBeatmaps     UserPrivileges = 2 << 7  // 256
	AdminPrivilegeManageServers      UserPrivileges = 2 << 8  // 512
	AdminPrivilegeManageSettings     UserPrivileges = 2 << 9  // 1024
	AdminPrivilegeManageBetakeys     UserPrivileges = 2 << 10 // 2048
	AdminPrivilegeManageReports      UserPrivileges = 2 << 11 // 4096
	AdminPrivilegeManageDocs         UserPrivileges = 2 << 12 // 8192
	AdminPrivilegeManageBadges       UserPrivileges = 2 << 13 // 16384
	AdminPrivilegeViewRAPLogs        UserPrivileges = 2 << 14 // 32768
	AdminPrivilegeManagePrivileges   UserPrivileges = 2 << 15 // 65536
	AdminPrivilegeSendAlerts         UserPrivileges = 2 << 16 // 131072
	AdminPrivilegeChatMod            UserPrivileges = 2 << 17 // 262144
	AdminPrivilegeKickUsers          UserPrivileges = 2 << 18 // 524288
	UserPrivilegePendingVerification UserPrivileges = 2 << 19 // 1048576
	UserPrivilegeTournamentStaff     UserPrivileges = 2 << 20 // 2097152
)

var privilegeNames = map[UserPrivileges]string{
	UserPrivilegePublic:              "Public",
	UserPrivilegeNormal:              "Normal",
	UserPrivilegeDonor:               "Donor",
	AdminPrivilegeAccessRAP:          "AccessRAP",
	AdminPrivilegeManageUsers:        "ManageUsers",
	AdminPrivilegeBanUsers:           "BanUsers",
	AdminPrivilegeSilenceUsers:       "SilenceUsers",
	AdminPrivilegeWipeUsers:          "WipeUsers",
	AdminPrivilegeManageBeatmaps:     "ManageBeatmaps",
	AdminPrivilegeManageServers:      "ManageServers",
	AdminPrivilegeManageSettings:     "ManageSettings",
	AdminPrivilegeManageBetakeys:     "ManageBetakeys",
	AdminPrivilegeManageReports:      "ManageReports",
	AdminPrivilegeManageDocs:         "ManageDocs",
	AdminPrivilegeManageBadges:       "ManageBadges",
	AdminPrivilegeViewRAPLogs:        "ViewRAPLogs",
	AdminPrivilegeManagePrivileges:   "ManagePrivileges",
	AdminPrivilegeSendAlerts:         "SendAlerts",
	AdminPrivilegeChatMod:            "ChatMod",
	AdminPrivilegeKickUsers:          "KickUsers",
	UserPrivilegePendingVerification: "PendingVerification",
	UserPrivilegeTournamentStaff:     "TournamentStaff",
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
