import nodemailer from "nodemailer";
import { google } from "googleapis";

/**
 * Sends email via the Gmail API using OAuth2 (nodemailer transport).
 * See README.md -> "Gmail API setup" for how to obtain the four env vars below.
 */
const OAuth2 = google.auth.OAuth2;

async function createTransporter() {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const accessToken = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken.token as string,
    },
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  try {
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: `Smart Laundry System <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Don't let a notification failure break the request flow — just log it.
    console.error("sendMail failed:", err);
  }
}

export const templates = {
  welcome: (name: string) => ({
    subject: "Welcome to Smart Laundry System",
    html: `<p>Hi ${name},</p><p>Your account has been created successfully. You can now log in and start using Smart Laundry System.</p>`,
  }),
  bookingCreated: (name: string, orderId: string) => ({
    subject: `Booking confirmed — Order #${orderId}`,
    html: `<p>Hi ${name},</p><p>Your laundry service booking (Order #${orderId}) has been received and is pending confirmation from the laundry center.</p>`,
  }),
  bookingStatus: (name: string, orderId: string, status: string) => ({
    subject: `Order #${orderId} — ${status}`,
    html: `<p>Hi ${name},</p><p>Your order #${orderId} status has been updated to: <b>${status}</b>.</p>`,
  }),
};
