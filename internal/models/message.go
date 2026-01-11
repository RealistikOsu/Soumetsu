package models

// Message represents a flash message to display to the user.
type Message interface {
	Type() string
	Content() string
}

// ErrorMessage represents an error message.
type ErrorMessage struct {
	C string
}

func (ErrorMessage) Type() string      { return "error" }
func (m ErrorMessage) Content() string { return m.C }

// NeutralMessage represents a neutral message.
type NeutralMessage struct {
	C string
}

func (NeutralMessage) Type() string      { return "" }
func (m NeutralMessage) Content() string { return m.C }

// InfoMessage represents an informational message.
type InfoMessage struct {
	C string
}

func (InfoMessage) Type() string      { return "info" }
func (m InfoMessage) Content() string { return m.C }

// SuccessMessage represents a success message.
type SuccessMessage struct {
	C string
}

func (SuccessMessage) Type() string      { return "positive" }
func (m SuccessMessage) Content() string { return m.C }

// WarningMessage represents a warning message.
type WarningMessage struct {
	C string
}

func (WarningMessage) Type() string      { return "warning" }
func (m WarningMessage) Content() string { return m.C }

// NewError creates an error message.
func NewError(content string) Message {
	return ErrorMessage{C: content}
}

// NewSuccess creates a success message.
func NewSuccess(content string) Message {
	return SuccessMessage{C: content}
}

// NewWarning creates a warning message.
func NewWarning(content string) Message {
	return WarningMessage{C: content}
}

// NewInfo creates an info message.
func NewInfo(content string) Message {
	return InfoMessage{C: content}
}

// NewNeutral creates a neutral message.
func NewNeutral(content string) Message {
	return NeutralMessage{C: content}
}
