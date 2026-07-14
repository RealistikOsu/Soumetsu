package payments

import "math"

// CalculateDonorPrice returns the price in the donor currency (GBP) for `months`
// of supporter. Ported from old-frontend funcmap: pow(months*3, 0.84).
func CalculateDonorPrice(months int) float64 {
	return math.Pow(float64(months)*3, 0.84)
}
