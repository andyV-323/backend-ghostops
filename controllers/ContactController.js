const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const client = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });

const SUPPORT_EMAIL = process.env.CONTACT_SUPPORT_EMAIL || "support@ghostopsai.com";
const SENDER_EMAIL  = process.env.CONTACT_SENDER_EMAIL  || "no-reply@ghostopsai.com";

const TAG_RE  = /<[^>]*>/g;
const CRLF_RE = /[\r\n]{3,}/g;

function sanitize(value, maxLen = 5000) {
	if (typeof value !== "string") return "";
	return value.replace(TAG_RE, "").replace(CRLF_RE, "\n\n").trim().slice(0, maxLen);
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

exports.handleContact = async (req, res) => {
	try {
		const name    = sanitize(req.body?.name,    100);
		const email   = sanitize(req.body?.email,   254).toLowerCase();
		const message = sanitize(req.body?.message, 4000);

		if (!name || !email || !message) {
			return res.status(400).json({ error: "Name, email, and message are required." });
		}
		if (!isValidEmail(email)) {
			return res.status(400).json({ error: "Invalid email address." });
		}

		// ── Notification to support inbox ─────────────────────────
		await client.send(new SendEmailCommand({
			Source: SENDER_EMAIL,
			Destination: { ToAddresses: [SUPPORT_EMAIL] },
			ReplyToAddresses: [email],
			Message: {
				Subject: { Data: `Ghost Ops Contact: ${name}`, Charset: "UTF-8" },
				Body: {
					Text: {
						Data: [
							`New message via ghostopsai.com contact form`,
							``,
							`Name:    ${name}`,
							`Email:   ${email}`,
							``,
							`Message:`,
							message,
						].join("\n"),
						Charset: "UTF-8",
					},
				},
			},
		}));

		// ── Auto-reply to the user (failure is non-fatal) ─────────
		try {
			await client.send(new SendEmailCommand({
				Source: SENDER_EMAIL,
				Destination: { ToAddresses: [email] },
				ReplyToAddresses: [SUPPORT_EMAIL],
				Message: {
					Subject: { Data: "We got your message — Ghost Ops", Charset: "UTF-8" },
					Body: {
						Text: {
							Data: [
								`Hi ${name},`,
								``,
								`Thanks for reaching out! Your message has been received and I'll get back to you as soon as possible.`,
								``,
								`If you have additional questions in the meantime, just reply to this email.`,
								``,
								`— Ghost Ops`,
							].join("\n"),
							Charset: "UTF-8",
						},
					},
				},
			}));
		} catch (autoReplyErr) {
			console.error("Auto-reply failed (non-fatal):", autoReplyErr.message);
		}

		return res.status(200).json({ message: "Message sent successfully." });
	} catch (err) {
		console.error("Contact form error:", err);
		return res.status(500).json({ error: "Failed to send message. Please try again." });
	}
};
