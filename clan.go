package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"math/rand"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// clanData contains minimal data for the clan page
// All clan data is now fetched client-side via Vue
type clanData struct {
	baseTemplateData
	ClanID    int
	ClanParam string // Raw URL param (can be ID or name)
}

func leaveClan(c *gin.Context) {
	i := c.Param("cid")
	// login check
	if getContext(c).User.ID == 0 {
		resp403(c)
		return
	}
	if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ? AND clan = ? AND perms = 8", getContext(c).User.ID, i).
		Scan(new(int)) == sql.ErrNoRows {
		// ดูว่าคนนี้มีแคลนหรือยัง
		if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ? AND clan = ?", getContext(c).User.ID, i).
			Scan(new(int)) == sql.ErrNoRows {
			addMessage(c, errorMessage{T(c, "What happened...? We just got... unexpected error?")})
			return
		}
		// กูไม่รู้หรอกว่ามันจะได้ผลมั้ย แต่ควยชั่งแม่งเย็ดแม่
		db.Exec("DELETE FROM user_clans WHERE user = ? AND clan = ?", getContext(c).User.ID, i)
		rd.Publish("rosu:clan_update", strconv.Itoa(getContext(c).User.ID))
		addMessage(c, successMessage{T(c, "You've left the clan.")})
		getSession(c).Save()
		c.Redirect(302, "/")
	} else {
		// เดี๋ยวไอ้เหี้ย มันออกไปยังวะ!!!
		if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ? AND clan = ?", getContext(c).User.ID, i).
			Scan(new(int)) == sql.ErrNoRows {
			addMessage(c, errorMessage{T(c, "What happened...? We just got... unexpected error?")})
			return
		}
		// ลบคำเชิญออก
		db.Exec("DELETE FROM clans_invites WHERE clan = ?", i)
		// ลบทุกคนออกจากแคลน :c
		var users_list []int
		rows, err := db.Query(fmt.Sprintf("SELECT user FROM user_clans WHERE clan = '%s'", i))
		if err != nil {
			slog.Error("There was an issue while getting clan users", "clan_id", i, "error", err)
			c.Error(err)
			return
		}
		defer rows.Close()
		for rows.Next() {
			var user_id int
			err := rows.Scan(&user_id)

			if err != nil {
				continue
			}

			users_list = append(users_list, user_id)
			//rd.Publish("rosu:clan_update", strconv.Itoa(user_id))
		}
		//db.QueryRow("SELECT user FROM user_clans WHERE clan = ?", i).Scan(&users_list)
		db.Exec("DELETE FROM user_clans WHERE clan = ?", i)
		// ควยไม่สร้างแม่งละสัส :c
		db.Exec("DELETE FROM clans WHERE id = ?", i)

		for _, user := range users_list {
			rd.Publish("rosu:clan_update", strconv.Itoa(user))
		}

		addMessage(c, successMessage{T(c, "Your clan has been disbanded")})
		getSession(c).Save()
		c.Redirect(302, "/")
	}

}

func clanPage(c *gin.Context) {
	// Parse clan ID from URL parameter
	// Can be numeric ID or clan name - Vue will resolve via API
	cid := c.Param("cid")
	clanID, _ := strconv.Atoi(cid)

	data := &clanData{
		baseTemplateData: baseTemplateData{
			TitleBar:  "Clan",
			DisableHH: true,
		},
		ClanID:    clanID,
		ClanParam: cid, // Pass raw param so Vue can resolve by name if needed
	}

	resp(c, 200, "clansample.html", data)
}

var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func randSeq(n int) string {
	rand.Seed(time.Now().UnixNano() + int64(3))
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func createInvite(c *gin.Context) {
	ctx := getContext(c)
	if string(c.PostForm("description")) != "" || string(c.PostForm("icon")) != "" || string(c.PostForm("tag")) != "" || string(c.PostForm("name")) != "" {
		// เช็คแปปว่ายศสูงพอมั้ย
		var perms int
		db.QueryRow("SELECT perms FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", ctx.User.ID).Scan(&perms)
		// ลบคำเชิญเก่าออก
		var clan int
		db.QueryRow("SELECT clan FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", ctx.User.ID).Scan(&clan)
		if clan == 0 {
			resp403(c)
			return
		}

		if db.QueryRow("SELECT 1 FROM clans WHERE tag = ? AND id != ?", c.PostForm("tag"), clan).
			Scan(new(int)) != sql.ErrNoRows {
			resp403(c)
			addMessage(c, errorMessage{T(c, "Someone already used that TAG! Please try another!")})
			return
		}

		var dbName string
		var dbDescription string
		var dbIcon string
		var dbTag string
		err := db.QueryRow("SELECT name, description, icon, tag FROM clans WHERE id = ?", clan).Scan(&dbName, &dbDescription, &dbIcon, &dbTag)
		if err != nil {
			slog.Error("Could not get clan data from database", "clan_id", clan, "error", err)
			c.Error(err)
		}

		name := c.PostForm("name")
		description := c.PostForm("description")
		icon := c.PostForm("icon")
		tag := c.PostForm("tag")

		if name == "" {
			name = dbName
		}

		if description == "" {
			description = dbDescription
		}

		if icon == "" {
			icon = dbIcon
		}

		if tag == "" {
			tag = dbName
		}

		db.Exec("UPDATE clans SET name = ?, description = ?, icon = ?, tag = ? WHERE id = ?", name, description, icon, tag, clan)

		if tag != "" {
			var users_list []int
			rows, err := db.Query(fmt.Sprintf("SELECT user FROM user_clans WHERE clan = %d", clan))
			if err != nil {
				slog.Error("There was an issue while getting clan users", "clan_id", clan, "error", err)
				c.Error(err)
				return
			}
			defer rows.Close()
			for rows.Next() {
				var user_id int
				err := rows.Scan(&user_id)

				if err != nil {
					continue
				}

				users_list = append(users_list, user_id)
				//rd.Publish("rosu:clan_update", strconv.Itoa(user_id))
			}
			for _, user := range users_list {
				rd.Publish("rosu:clan_update", strconv.Itoa(user))
			}
		}
	} else {

		if ctx.User.ID == 0 {
			resp403(c)
			return
		}
		// เช็คแปปว่ายศสูงพอมั้ย
		var perms int
		db.QueryRow("SELECT perms FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", ctx.User.ID).Scan(&perms)
		// ลบคำเชิญเก่าออก
		var clan int
		db.QueryRow("SELECT clan FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", ctx.User.ID).Scan(&clan)
		if clan == 0 {
			resp403(c)
			return
		}

		db.Exec("DELETE FROM clans_invites WHERE clan = ?", clan)
		db.Exec("INSERT INTO clans_invites(clan, invite) VALUES (?, ?)", clan, randSeq(8))
	}
	addMessage(c, successMessage{T(c, "Success!")})
	getSession(c).Save()
	c.Redirect(302, "/clan/manage")
}

func clanInvite(c *gin.Context) {
	i := c.Param("inv")

	res := resolveInvite(i)
	s := strconv.Itoa(res)
	if res != 0 {

		// ไอ้บ้านี้มันล็อกอินยัง
		if getContext(c).User.ID == 0 {
			resp403(c)
			return
		}

		// เห้ยไอ้นี้โดนแบนปะวะ
		if getContext(c).User.Privileges&1 != 1 {
			resp403(c)
			return
		}

		// มีแคลนนี้ปะวะเนี่ย
		if db.QueryRow("SELECT 1 FROM clans WHERE id = ?", res).
			Scan(new(int)) == sql.ErrNoRows {

			addMessage(c, errorMessage{T(c, "Seems like we don't found that clan.")})
			getSession(c).Save()
			c.Redirect(302, "/c/"+s)
			return
		}
		// ไอ้เหี้ยนี้อยู่ในแคลนปะวะ?
		if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ?", getContext(c).User.ID).
			Scan(new(int)) != sql.ErrNoRows {

			addMessage(c, errorMessage{T(c, "Seems like you're already in the clan.")})
			getSession(c).Save()
			c.Redirect(302, "/c/"+s)
			return
		}

		// ควยไรสัส
		var count int
		var limit int
		// เช็คคน
		db.QueryRow("SELECT COUNT(*) FROM user_clans WHERE clan = ? ", res).Scan(&count)
		db.QueryRow("SELECT mlimit FROM clans WHERE id = ? ", res).Scan(&limit)
		if count >= limit {
			addMessage(c, errorMessage{T(c, "Ow, I'm sorry this clan is already full ;w;")})
			getSession(c).Save()
			c.Redirect(302, "/c/"+s)
			return
		}
		// เข้าแคลน
		db.Exec("INSERT INTO `user_clans`(user, clan, perms) VALUES (?, ?, 1);", getContext(c).User.ID, res)
		rd.Publish("rosu:clan_update", strconv.Itoa(getContext(c).User.ID))
		addMessage(c, successMessage{T(c, "You've joined the clan! Hooray!! \\(^o^)/")})
		getSession(c).Save()
		c.Redirect(302, "/c/"+s)
	} else {
		resp403(c)
		addMessage(c, errorMessage{T(c, "NO!!!")})
	}
}

func clanKick(c *gin.Context) {
	if getContext(c).User.ID == 0 {
		resp403(c)
		return
	}

	if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ? AND perms = 8", getContext(c).User.ID).
		Scan(new(int)) == sql.ErrNoRows {
		resp403(c)
		return
	}

	member, _ := strconv.ParseInt(c.PostForm("member"), 10, 32)
	if member == 0 {
		resp403(c)
		return
	}

	if db.QueryRow("SELECT 1 FROM user_clans WHERE user = ? AND perms = 1", member).
		Scan(new(int)) == sql.ErrNoRows {
		resp403(c)
		return
	}

	db.Exec("DELETE FROM user_clans WHERE user = ?", member)
	rd.Publish("rosu:clan_update", c.PostForm("member"))
	addMessage(c, successMessage{T(c, "Success!")})
	getSession(c).Save()
	c.Redirect(302, "/clan/manage")
}

func resolveInvite(c string) int {
	var clanid int
	row := db.QueryRow("SELECT clan FROM clans_invites WHERE invite = ?", c)
	err := row.Scan(&clanid)

	if err != nil {
		slog.Error("Could not get clan ID from invite", "invite", c, "error", err)
		return -1
	}
	return clanid
}
