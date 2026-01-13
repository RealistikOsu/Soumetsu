package templates

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"math"
	"math/rand"
	"os"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/bbcode"
	"github.com/RealistikOsu/soumetsu/internal/pkg/doc"
	"github.com/dustin/go-humanize"
	"github.com/russross/blackfriday"
	"zxq.co/ripple/playstyle"
)

type ConfigAccessor interface {
	GetAvatarURL() string
	GetBanchoURL() string
	GetAPIURL() string
	GetBeatmapMirrorAPIURL() string
	GetRecaptchaSiteKey() string
	GetDiscordServerURL() string
}

type CSRFService interface {
	Generate(userID int) (string, error)
}

func FuncMap(csrfService CSRFService) template.FuncMap {
	return template.FuncMap{
		"html": func(value interface{}) template.HTML {
			return template.HTML(fmt.Sprint(value))
		},
		// Vue template expression helper - outputs Vue delimiters without HTML escaping
		// Usage: {{ v "data.username" }} outputs: [[ data.username ]]
		"v": func(expr string) template.HTML {
			return template.HTML("[[ " + expr + " ]]")
		},
		"navbarItem": func(currentPath, name, path string) template.HTML {
			var act string
			if path == currentPath {
				act = "active "
			}
			return template.HTML(fmt.Sprintf(`<a class="%sitem" href="%s">%s</a>`, act, path, name))
		},
		"curryear": func() int {
			return time.Now().Year()
		},
		"hasAdmin": func(privs models.UserPrivileges) bool {
			return privs&models.AdminPrivilegeAccessRAP > 0
		},
		"getUserRole": func(privs models.UserPrivileges) string {
			if privs&models.AdminPrivilegeManageUsers > 0 {
				return "Admin"
			}
			if privs&models.AdminPrivilegeAccessRAP > 0 {
				return "Moderator"
			}
			if privs&models.UserPrivilegeDonor > 0 {
				return "Supporter"
			}
			return ""
		},
		"isStaff": func(privs models.UserPrivileges) bool {
			return privs&models.AdminPrivilegeAccessRAP > 0
		},
		"isRAP": func(p string) bool {
			parts := strings.Split(p, "/")
			return len(parts) > 1 && parts[1] == "admin"
		},
		"favMode": func(favMode float64, current int) string {
			if int(favMode) == current {
				return "active "
			}
			return ""
		},
		"string": func(s string) string {
			if s == "" {
				return ""
			}
			return string(s)
		},
		"slice": func(els ...interface{}) []interface{} {
			return els
		},
		"sliceArray": func(arr interface{}, start, end int) []interface{} {
			if arr == nil {
				return []interface{}{}
			}
			var result []interface{}
			switch v := arr.(type) {
			case []interface{}:
				if start < 0 {
					start = 0
				}
				if end > len(v) {
					end = len(v)
				}
				if start >= end {
					return []interface{}{}
				}
				return v[start:end]
			case []map[string]interface{}:
				if start < 0 {
					start = 0
				}
				if end > len(v) {
					end = len(v)
				}
				if start >= end {
					return []interface{}{}
				}
				for i := start; i < end; i++ {
					result = append(result, v[i])
				}
				return result
			}
			return []interface{}{}
		},
		"get": func(m interface{}, key string) interface{} {
			if m == nil {
				return nil
			}
			if mMap, ok := m.(map[string]interface{}); ok {
				return mMap[key]
			}
			return nil
		},
		"int": func(f interface{}) int {
			if f == nil {
				return 0
			}
			switch f := f.(type) {
			case int:
				return f
			case float64:
				return int(f)
			case float32:
				return int(f)
			}
			return 0
		},
		"float": func(i int) float64 {
			return float64(i)
		},
		"atoi": func(s interface{}) interface{} {
			if s == nil {
				return 0
			}
			str := fmt.Sprint(s)
			if str == "" {
				return 0
			}
			i, err := strconv.Atoi(str)
			if err != nil {
				return 0
			}
			return float64(i)
		},
		"atoint": func(s interface{}) int {
			if s == nil {
				return 0
			}
			str := fmt.Sprint(s)
			if str == "" {
				return 0
			}
			i, _ := strconv.Atoi(str)
			return i
		},
		"parseUserpage": func(s string) template.HTML {
			return template.HTML(bbcode.Compile(s))
		},
		"time": func(s string) template.HTML {
			t, _ := time.Parse(time.RFC3339, s)
			return _time(s, t)
		},
		"timeFromTime": func(t time.Time) template.HTML {
			return _time(t.Format(time.RFC3339), t)
		},
		"timeFromUnix": func(i int64) template.HTML {
			t := time.Unix(i, 0)
			return _time(t.Format(time.RFC3339), t)
		},
		"timeAddDay": func(s string) template.HTML {
			t, _ := time.Parse(time.RFC3339, s)
			t = t.Add(time.Hour * 24)
			return _time(t.Format(time.RFC3339), t)
		},
		"nativeTime": func(s string) time.Time {
			t, _ := time.Parse(time.RFC3339, s)
			return t
		},
		"band": func(i1 int, i ...int) int {
			for _, el := range i {
				i1 &= el
			}
			return i1
		},
		"humanize": func(f float64) string {
			return humanize.Commaf(f)
		},
		"levelPercent": func(l float64) string {
			_, f := math.Modf(l)
			f *= 100
			return fmt.Sprintf("%.0f", f)
		},
		"level": func(l float64) string {
			i, _ := math.Modf(l)
			return fmt.Sprintf("%.0f", i)
		},
		"log": fmt.Println,
		"has": func(priv1 interface{}, priv2 float64) bool {
			var p1 uint64
			switch priv1 := priv1.(type) {
			case models.UserPrivileges:
				p1 = uint64(priv1)
			case float64:
				p1 = uint64(priv1)
			case int:
				p1 = uint64(priv1)
			}
			return p1&uint64(priv2) == uint64(priv2)
		},
		"_range": func(x int, y ...int) ([]int, error) {
			switch len(y) {
			case 0:
				r := make([]int, x)
				for i := range r {
					r[i] = i
				}
				return r, nil
			case 1:
				nums, up := pos(y[0] - x)
				r := make([]int, nums)
				for i := range r {
					if up {
						r[i] = i + x + 1
					} else {
						r[i] = i + y[0]
					}
				}
				if !up {
					// reverse r
					sort.Sort(sort.Reverse(sort.IntSlice(r)))
				}
				return r, nil
			}
			return nil, errors.New("y must be at maximum 1 parameter")
		},
		"blackfriday": func(m string) template.HTML {
			idx := strings.Index(m, "\n---\n")
			if idx == -1 {
				return template.HTML(blackfriday.Run([]byte(m), blackfriday.WithExtensions(blackfriday.CommonExtensions)))
			}
			return template.HTML(
				blackfriday.Run(
					[]byte(m[idx+5:]),
					blackfriday.WithExtensions(blackfriday.CommonExtensions),
				),
			)
		},
		"i": func(a bool, x, y interface{}) interface{} {
			if a {
				return x
			}
			return y
		},
		"modes": func() []string {
			return []string{
				"osu!",
				"Taiko",
				"Catch",
				"Mania",
			}
		},
		"_or": func(args ...interface{}) interface{} {
			for _, a := range args {
				if a != nil && a != false {
					return a
				}
			}
			return nil
		},
		"unixNano": func() string {
			return strconv.FormatInt(soumetsuStarted, 10)
		},
		"playstyle": func(i float64) string {
			var parts []string
			p := int(i)
			for k, v := range playstyle.Styles {
				if p&(1<<uint(k)) > 0 {
					parts = append(parts, v)
				}
			}
			return strings.Join(parts, ", ")
		},
		"plus": func(i ...float64) float64 {
			var sum float64
			for _, i := range i {
				sum += i
			}
			return sum
		},
		"minus": func(i1 float64, i ...float64) float64 {
			for _, i := range i {
				i1 -= i
			}
			return i1
		},
		"rsin": func(i interface{}) interface{} {
			if i == nil {
				return []struct{}{}
			}
			return i
		},
		"loadjson": func(jsonfile string) interface{} {
			f, err := os.ReadFile(jsonfile)
			if err != nil {
				return nil
			}
			var x interface{}
			err = json.Unmarshal(f, &x)
			if err != nil {
				return nil
			}
			return x
		},
		"teamJSON": func() map[string]interface{} {
			f, err := os.ReadFile("team.json")
			if err != nil {
				return nil
			}
			var m map[string]interface{}
			json.Unmarshal(f, &m)
			return m
		},
		"in": func(a1 interface{}, as ...interface{}) bool {
			for _, a := range as {
				if a == a1 {
					return true
				}
			}
			return false
		},
		"capitalise":    strings.Title,
		"servicePrefix": func(s string) string { return servicePrefixes[s] },
		"randomLogoColour": func() string {
			if rand.Int()%4 == 0 {
				return logoColours[rand.Int()%len(logoColours)]
			}
			return "pink"
		},
		"after": func(s string) bool {
			t, _ := time.Parse(time.RFC3339, s)
			return t.After(time.Now())
		},
		"styles": func() []string {
			return playstyle.Styles[:]
		},
		"shift": func(n1, n2 int) int {
			return n1 << uint(n2)
		},
		"calculateDonorPrice": func(a float64) string {
			return fmt.Sprintf("%.2f", math.Pow(a*3, 0.7))
		},
		"perc": func(i, total float64) string {
			return fmt.Sprintf("%.0f", i/total*100)
		},
		"atLeastOne": func(i int) int {
			if i < 1 {
				i = 1
			}
			return i
		},
		"version": func() string {
			return version
		},
		"documentationFiles": func(loader *doc.Loader, lang string) []doc.LanguageDoc {
			if loader == nil {
				return nil
			}
			return loader.GetDocs(lang)
		},
		"documentationData": func(loader *doc.Loader, slug string, language string) doc.File {
			if loader == nil {
				return doc.File{}
			}
			if i, err := strconv.Atoi(slug); err == nil {
				slug = loader.SlugFromOldID(i)
			}
			return loader.GetFile(slug, language)
		},
		"privilegesToString": func(privs float64) string {
			return models.UserPrivileges(privs).String()
		},
		"htmlescaper": template.HTMLEscaper,
		"hhmm": func(seconds float64) string {
			return fmt.Sprintf("%02dh %02dm", int(math.Floor(seconds/3600)), int(math.Floor(seconds/60))%60)
		},
		"stringLower": strings.ToLower,
		"qb": func(query string, args ...interface{}) map[string]interface{} {
			return map[string]interface{}{
				"frozen": map[string]interface{}{
					"Bool": false,
				},
			}
		},
		"rediget": func(key string) string {
			return "0"
		},
		"config": func(key string, confs ...interface{}) string {
			var conf interface{}
			if len(confs) > 0 && confs[0] != nil {
				conf = confs[0]
			}
			if conf == nil {
				return ""
			}
			val := reflect.ValueOf(conf)
			if val.Kind() == reflect.Ptr {
				val = val.Elem()
			}
			if val.Kind() != reflect.Struct {
				return ""
			}

			keyMap := map[string]struct {
				section string
				field   string
			}{
				"APP_AVATAR_URL":         {"App", "AvatarURL"},
				"APP_BANCHO_URL":         {"App", "BanchoURL"},
				"APP_API_URL":            {"App", "APIURL"},
				"BEATMAP_MIRROR_API_URL": {"Beatmap", "MirrorAPIURL"},
				"RECAPTCHA_SITE_KEY":     {"Security", "RecaptchaSiteKey"},
				"DISCORD_SERVER_URL":     {"Discord", "ServerURL"},
			}

			mapping, ok := keyMap[key]
			if !ok {
				return ""
			}

			sectionField := val.FieldByName(mapping.section)
			if !sectionField.IsValid() || sectionField.Kind() != reflect.Struct {
				return ""
			}

			field := sectionField.FieldByName(mapping.field)
			if !field.IsValid() || !field.CanInterface() {
				return ""
			}

			return fmt.Sprint(field.Interface())
		},
		"csrfGenerate": func(userID int) string {
			if csrfService == nil || userID == 0 {
				return ""
			}
			token, err := csrfService.Generate(userID)
			if err != nil {
				return ""
			}
			return token
		},
		"ieForm": func(ctx interface{}) template.HTML {
			if csrfService == nil {
				return template.HTML("")
			}
			var uid int

			// Try to extract user ID from RequestContext
			// ctx can be *apicontext.RequestContext or accessed via reflection
			if ctx != nil {
				ctxVal := reflect.ValueOf(ctx)
				if ctxVal.Kind() == reflect.Ptr {
					ctxVal = ctxVal.Elem()
				}
				if ctxVal.Kind() == reflect.Struct {
					userField := ctxVal.FieldByName("User")
					if userField.IsValid() {
						if userField.Kind() == reflect.Struct {
							idField := userField.FieldByName("ID")
							if idField.IsValid() {
								switch idField.Kind() {
								case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
									uid = int(idField.Int())
								case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
									uid = int(idField.Uint())
								}
							}
						}
					}
				}
			}

			if uid == 0 {
				return template.HTML("")
			}
			token, err := csrfService.Generate(uid)
			if err != nil {
				return template.HTML("")
			}
			return template.HTML(fmt.Sprintf(`<input type="hidden" name="csrf" value="%s">`, template.HTMLEscapeString(token)))
		},
		"systemSettings": func(keys ...string) map[string]interface{} {
			result := make(map[string]interface{})
			for _, key := range keys {
				result[key] = map[string]interface{}{
					"String": "",
					"Int":    0,
				}
			}
			return result
		},
		"T": func(key string) string {
			return key
		},
		"country": func(countryCode string, showName bool) template.HTML {
			if countryCode == "" {
				return template.HTML("")
			}
			countryLower := strings.ToLower(countryCode)
			html := fmt.Sprintf(`<img src="/static/images/new-flags/flag-%s.svg" class="w-4 h-3 rounded" alt="%s">`, countryLower, countryCode)
			return template.HTML(html)
		},
		"dcAPI": func(discordID interface{}) interface{} {
			return nil
		},
	}
}

var soumetsuStarted = time.Now().UnixNano()

var servicePrefixes = map[string]string{
	"github":  "https://github.com/",
	"twitter": "https://twitter.com/",
	"mail":    "mailto:",
}

var logoColours = [...]string{
	"blue",
	"green",
	"orange",
	"red",
}

func pos(x int) (int, bool) {
	if x > 0 {
		return x, true
	}
	return x * -1, false
}

func _time(s string, t time.Time) template.HTML {
	return template.HTML(fmt.Sprintf(`<time class="timeago" datetime="%s">%v</time>`, s, t))
}

var version = "dev"
