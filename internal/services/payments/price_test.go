package payments

import (
	"math"
	"testing"
)

func TestCalculateDonorPrice(t *testing.T) {
	cases := []struct{ months int; want float64 }{
		{1, math.Pow(3, 0.84)},
		{3, math.Pow(9, 0.84)},
		{12, math.Pow(36, 0.84)},
	}
	for _, c := range cases {
		got := CalculateDonorPrice(c.months)
		if math.Abs(got-c.want) > 0.001 {
			t.Fatalf("months=%d got %.4f want %.4f", c.months, got, c.want)
		}
	}
}
