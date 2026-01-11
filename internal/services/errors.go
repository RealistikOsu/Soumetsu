package services

import "net/http"

// ServiceError represents a service-level error.
type ServiceError struct {
	Message    string
	Code       string
	StatusCode int
}

func (e *ServiceError) Error() string {
	return e.Message
}

// Common service errors.
var (
	ErrNotFound = &ServiceError{
		Message:    "Resource not found",
		Code:       "not_found",
		StatusCode: http.StatusNotFound,
	}

	ErrUnauthorized = &ServiceError{
		Message:    "Unauthorized",
		Code:       "unauthorized",
		StatusCode: http.StatusUnauthorized,
	}

	ErrForbidden = &ServiceError{
		Message:    "Forbidden",
		Code:       "forbidden",
		StatusCode: http.StatusForbidden,
	}

	ErrBadRequest = &ServiceError{
		Message:    "Bad request",
		Code:       "bad_request",
		StatusCode: http.StatusBadRequest,
	}

	ErrInternal = &ServiceError{
		Message:    "Internal server error",
		Code:       "internal_error",
		StatusCode: http.StatusInternalServerError,
	}

	ErrConflict = &ServiceError{
		Message:    "Resource already exists",
		Code:       "conflict",
		StatusCode: http.StatusConflict,
	}
)

// NewServiceError creates a new service error.
func NewServiceError(message, code string, statusCode int) *ServiceError {
	return &ServiceError{
		Message:    message,
		Code:       code,
		StatusCode: statusCode,
	}
}

// NewBadRequest creates a bad request error with a custom message.
func NewBadRequest(message string) *ServiceError {
	return &ServiceError{
		Message:    message,
		Code:       "bad_request",
		StatusCode: http.StatusBadRequest,
	}
}

// NewNotFound creates a not found error with a custom message.
func NewNotFound(message string) *ServiceError {
	return &ServiceError{
		Message:    message,
		Code:       "not_found",
		StatusCode: http.StatusNotFound,
	}
}

// NewForbidden creates a forbidden error with a custom message.
func NewForbidden(message string) *ServiceError {
	return &ServiceError{
		Message:    message,
		Code:       "forbidden",
		StatusCode: http.StatusForbidden,
	}
}

// NewConflict creates a conflict error with a custom message.
func NewConflict(message string) *ServiceError {
	return &ServiceError{
		Message:    message,
		Code:       "conflict",
		StatusCode: http.StatusConflict,
	}
}
