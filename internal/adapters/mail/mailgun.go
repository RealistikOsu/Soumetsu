package mail

import (
	"context"

	"github.com/RealistikOsu/soumetsu/internal/config"
	"gopkg.in/mailgun/mailgun-go.v1"
)

type Client struct {
	mg   mailgun.Mailgun
	from string
}

func New(cfg config.MailgunConfig) *Client {
	mg := mailgun.NewMailgun(
		cfg.Domain,
		cfg.APIKey,
		cfg.PublicKey,
	)

	return &Client{
		mg:   mg,
		from: cfg.From,
	}
}

type SendEmailInput struct {
	To      string
	Subject string
	Body    string
	HTML    string
}

func (c *Client) Send(ctx context.Context, input SendEmailInput) (string, error) {
	message := mailgun.NewMessage(
		c.from,
		input.Subject,
		input.Body,
		input.To,
	)

	if input.HTML != "" {
		message.SetHtml(input.HTML)
	}

	_, id, err := c.mg.Send(message)
	return id, err
}

func (c *Client) SendPasswordReset(ctx context.Context, to, resetKey, baseURL string) (string, error) {
	resetURL := baseURL + "/password-reset/continue?k=" + resetKey

	body := "Hey!\n\n" +
		"Someone (hopefully you) requested a password reset for your account. " +
		"If this was you, click the link below to reset your password:\n\n" +
		resetURL + "\n\n" +
		"If you didn't request this, you can safely ignore this email.\n\n" +
		"- The Soumetsu Team"

	html := `<p>Hey!</p>
<p>Someone (hopefully you) requested a password reset for your account.
If this was you, click the link below to reset your password:</p>
<p><a href="` + resetURL + `">` + resetURL + `</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>- The Soumetsu Team</p>`

	return c.Send(ctx, SendEmailInput{
		To:      to,
		Subject: "Password Reset Request",
		Body:    body,
		HTML:    html,
	})
}
