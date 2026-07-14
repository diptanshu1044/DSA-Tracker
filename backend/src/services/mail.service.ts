import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) {
    return transporter;
  }

  if (!env.SMTP_HOST) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        }
      : {}),
  });

  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

/**
 * Sends email when SMTP is configured.
 * Without SMTP, logs the full message to the console and returns false
 * (caller may expose reset links in API in non-production).
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.info(
      `[mail] SMTP not configured. Would send to ${options.to}: ${options.subject}\n${options.text}`,
    );
    return false;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return true;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<boolean> {
  return sendMail({
    to,
    subject: "Reset your DSA Tracker password",
    text: [
      "You requested a password reset for your DSA Tracker account.",
      "",
      `Open this link to choose a new password (expires in 1 hour):`,
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset for your DSA Tracker account.</p>
      <p><a href="${resetUrl}">Reset your password</a> (link expires in 1 hour).</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
