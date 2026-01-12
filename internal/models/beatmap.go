package models

type Beatmap struct {
	ID               int     `json:"BeatmapID"`
	ParentSetID      int     `json:"ParentSetID"`
	DiffName         string  `json:"DiffName"`
	FileMD5          string  `json:"FileMD5"`
	Mode             int     `json:"Mode"`
	BPM              float64 `json:"BPM"`
	AR               float32 `json:"AR"`
	OD               float32 `json:"OD"`
	CS               float32 `json:"CS"`
	HP               float32 `json:"HP"`
	TotalLength      int     `json:"TotalLength"`
	HitLength        int     `json:"HitLength"`
	Playcount        int     `json:"Playcount"`
	Passcount        int     `json:"Passcount"`
	MaxCombo         int     `json:"MaxCombo"`
	DifficultyRating float64 `json:"DifficultyRating"`
}

type BeatmapSet struct {
	ID               int       `json:"SetID"`
	ChildrenBeatmaps []Beatmap `json:"ChildrenBeatmaps"`
	RankedStatus     int       `json:"RankedStatus"`
	Artist           string    `json:"Artist"`
	Title            string    `json:"Title"`
	Creator          string    `json:"Creator"`
	Source           string    `json:"Source"`
	Tags             string    `json:"Tags"`
}

const (
	StatusGraveyard = -2
	StatusWIP       = -1
	StatusPending   = 0
	StatusRanked    = 1
	StatusApproved  = 2
	StatusQualified = 3
	StatusLoved     = 4
)

func (b BeatmapSet) IsRanked() bool {
	return b.RankedStatus == StatusRanked || b.RankedStatus == StatusApproved
}
