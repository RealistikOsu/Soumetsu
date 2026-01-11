// Package templates provides template function maps.
package templates

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/ioutil"
	"math"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/RealistikOsu/soumetsu/internal/pkg/bbcode"
	"github.com/RealistikOsu/soumetsu/internal/pkg/doc"
	"github.com/dustin/go-humanize"
	"github.com/russross/blackfriday"
	"zxq.co/ripple/playstyle"
)

// FuncMap returns the template function map.
// Note: This version removes all DB queries - data should be passed from handlers.
func FuncMap() template.FuncMap {
	return template.FuncMap{
		// html disables HTML escaping on the values it is given.
		"html": func(value interface{}) template.HTML {
			return template.HTML(fmt.Sprint(value))
		},
		// navbarItem is a function to generate an item in the navbar.
		// The reason why this exists is that I wanted to have the currently
		// selected element in the navbar having the "active" class.
		"navbarItem": func(currentPath, name, path string) template.HTML {
			var act string
			if path == currentPath {
				act = "active "
			}
			return template.HTML(fmt.Sprintf(`<a class="%sitem" href="%s">%s</a>`, act, path, name))
		},
		// curryear returns the current year.
		"curryear": func() int {
			return time.Now().Year()
		},
		// hasAdmin returns, based on the user's privileges, whether they should be
		// able to see the RAP button (aka AdminPrivilegeAccessRAP).
		"hasAdmin": func(privs common.UserPrivileges) bool {
			return privs&common.AdminPrivilegeAccessRAP > 0
		},
		// getUserRole returns the role name based on user privileges
		"getUserRole": func(privs common.UserPrivileges) string {
			// Check from highest to lowest priority
			if privs&common.AdminPrivilegeManageUsers > 0 {
				return "Admin"
			}
			if privs&common.AdminPrivilegeAccessRAP > 0 {
				return "Moderator"
			}
			if privs&common.UserPrivilegeDonor > 0 {
				return "Supporter"
			}
			return ""
		},
		// isStaff returns whether a user has any staff privileges
		"isStaff": func(privs common.UserPrivileges) bool {
			return privs&common.AdminPrivilegeAccessRAP > 0
		},
		// isRAP returns whether the current page is in RAP.
		"isRAP": func(p string) bool {
			parts := strings.Split(p, "/")
			return len(parts) > 1 && parts[1] == "admin"
		},
		// favMode is just a helper function for user profiles. Basically checks
		// whether a float and an int are ==, and if they are it will return "active ",
		// so that the element in the mode menu of a user profile can be marked as
		// the current active element.
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
		// slice generates a []interface{} with the elements it is given.
		// useful to iterate over some elements, like this:
		//  {{ range slice 1 2 3 }}{{ . }}{{ end }}
		"slice": func(els ...interface{}) []interface{} {
			return els
		},
		// sliceArray slices an array/slice from start to end (exclusive)
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
		// get retrieves a value from a map[string]interface{} by key
		"get": func(m interface{}, key string) interface{} {
			if m == nil {
				return nil
			}
			if mMap, ok := m.(map[string]interface{}); ok {
				return mMap[key]
			}
			return nil
		},
		// int converts a float/int to an int.
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
		// float converts an int to a float.
		"float": func(i int) float64 {
			return float64(i)
		},
		// atoi converts a string to an int and then a float64.
		// If s is not an actual int, it returns nil.
		"atoi": func(s string) interface{} {
			i, err := strconv.Atoi(s)
			if err != nil {
				return nil
			}
			return float64(i)
		},
		// atoint is like atoi but returns always an int.
		"atoint": func(s string) int {
			i, _ := strconv.Atoi(s)
			return i
		},
		// parseUserpage compiles BBCode to HTML.
		"parseUserpage": func(s string) template.HTML {
			return template.HTML(bbcode.Compile(s))
		},
		// time converts a RFC3339 timestamp to the HTML element <time>.
		"time": func(s string) template.HTML {
			t, _ := time.Parse(time.RFC3339, s)
			return _time(s, t)
		},
		// timeFromTime generates a time from a native Go time.Time
		"timeFromTime": func(t time.Time) template.HTML {
			return _time(t.Format(time.RFC3339), t)
		},
		// timeAddDay is basically time but adds a day.
		"timeAddDay": func(s string) template.HTML {
			t, _ := time.Parse(time.RFC3339, s)
			t = t.Add(time.Hour * 24)
			return _time(t.Format(time.RFC3339), t)
		},
		// nativeTime creates a native Go time.Time from a RFC3339 timestamp.
		"nativeTime": func(s string) time.Time {
			t, _ := time.Parse(time.RFC3339, s)
			return t
		},
		// band is a bitwise AND.
		"band": func(i1 int, i ...int) int {
			for _, el := range i {
				i1 &= el
			}
			return i1
		},
		// humanize pretty-prints a float, e.g.
		//     humanize(1000) == "1,000"
		"humanize": func(f float64) string {
			return humanize.Commaf(f)
		},
		// levelPercent basically does this:
		//     levelPercent(56.23215) == "23"
		"levelPercent": func(l float64) string {
			_, f := math.Modf(l)
			f *= 100
			return fmt.Sprintf("%.0f", f)
		},
		// level removes the decimal part from a float.
		"level": func(l float64) string {
			i, _ := math.Modf(l)
			return fmt.Sprintf("%.0f", i)
		},
		"log": fmt.Println,
		// has returns whether priv1 has all 1 bits of priv2, aka priv1 & priv2 == priv2
		"has": func(priv1 interface{}, priv2 float64) bool {
			var p1 uint64
			switch priv1 := priv1.(type) {
			case common.UserPrivileges:
				p1 = uint64(priv1)
			case float64:
				p1 = uint64(priv1)
			case int:
				p1 = uint64(priv1)
			}
			return p1&uint64(priv2) == uint64(priv2)
		},
		// _range is like python range's.
		// If it is given 1 argument, it returns a []int containing numbers from 0
		// to x.
		// If it is given 2 arguments, it returns a []int containing numers from x
		// to y if x < y, from y to x if y < x.
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
		// blackfriday passes some markdown through blackfriday.
		"blackfriday": func(m string) template.HTML {
			// The reason of m[strings.Index...] is to remove the "header", where
			// there is the information about the file (namely, title, old_id and
			// reference_version)
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
		// i is an inline if.
		// i (cond) (true) (false)
		"i": func(a bool, x, y interface{}) interface{} {
			if a {
				return x
			}
			return y
		},
		// modes returns an array containing all the modes (in their string representation).
		"modes": func() []string {
			return []string{
				"osu!",
				"Taiko",
				"Catch",
				"Mania",
			}
		},
		// _or is like or, but has only false and nil as its "falsey" values
		"_or": func(args ...interface{}) interface{} {
			for _, a := range args {
				if a != nil && a != false {
					return a
				}
			}
			return nil
		},
		// unixNano returns the UNIX timestamp of when soumetsu was started in nanoseconds.
		"unixNano": func() string {
			return strconv.FormatInt(soumetsuStarted, 10)
		},
		// playstyle returns the string representation of a playstyle.
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
		// arithmetic plus/minus
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
		// rsin - Return Slice If Nil
		"rsin": func(i interface{}) interface{} {
			if i == nil {
				return []struct{}{}
			}
			return i
		},
		// loadjson loads a json file.
		"loadjson": func(jsonfile string) interface{} {
			f, err := ioutil.ReadFile(jsonfile)
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
		// teamJSON returns the data of team.json
		"teamJSON": func() map[string]interface{} {
			f, err := ioutil.ReadFile("team.json")
			if err != nil {
				return nil
			}
			var m map[string]interface{}
			json.Unmarshal(f, &m)
			return m
		},
		// in returns whether the first argument is in one of the following
		"in": func(a1 interface{}, as ...interface{}) bool {
			for _, a := range as {
				if a == a1 {
					return true
				}
			}
			return false
		},
		"capitalise": strings.Title,
		// servicePrefix gets the prefix of a service, like github.
		"servicePrefix": func(s string) string { return servicePrefixes[s] },
		// randomLogoColour picks a "random" colour for ripple's logo.
		"randomLogoColour": func() string {
			if rand.Int()%4 == 0 {
				return logoColours[rand.Int()%len(logoColours)]
			}
			return "pink"
		},
		// after checks whether a certain time is after time.Now()
		"after": func(s string) bool {
			t, _ := time.Parse(time.RFC3339, s)
			return t.After(time.Now())
		},
		// styles returns playstyle.Styles
		"styles": func() []string {
			return playstyle.Styles[:]
		},
		// shift shifts n1 by n2
		"shift": func(n1, n2 int) int {
			return n1 << uint(n2)
		},
		// calculateDonorPrice calculates the price of x donor months in POUNDS I THINK.
		"calculateDonorPrice": func(a float64) string {
			return fmt.Sprintf("%.2f", math.Pow(a*3, 0.7))
		},
		// perc returns a percentage
		"perc": func(i, total float64) string {
			return fmt.Sprintf("%.0f", i/total*100)
		},
		// atLeastOne returns 1 if i < 1, or i otherwise.
		"atLeastOne": func(i int) int {
			if i < 1 {
				i = 1
			}
			return i
		},
		// version gets what's the current Soumetsu version.
		"version": func() string {
			return version
		},
		// documentationFiles returns documentation files (requires doc loader to be passed)
		"documentationFiles": func(loader *doc.Loader, lang string) []doc.LanguageDoc {
			if loader == nil {
				return nil
			}
			return loader.GetDocs(lang)
		},
		// documentationData retrieves a documentation file
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
			return common.Privileges(privs).String()
		},
		"htmlescaper": template.HTMLEscaper,
		"hhmm": func(seconds float64) string {
			return fmt.Sprintf("%02dh %02dm", int(math.Floor(seconds/3600)), int(math.Floor(seconds/60))%60)
		},
		// stringLower converts a string to lowercase
		"stringLower": strings.ToLower,
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

// version is the current Soumetsu version.
// This should be set at build time or loaded from config.
var version = "dev"
