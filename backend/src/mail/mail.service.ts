import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private isEthereal = false;
  private lastEmailPreviewUrl: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.password');

    if (user && pass && host && host !== 'sandbox.smtp.mailtrap.io') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
      });
      this.logger.log(`Nodemailer initialized with custom SMTP host: ${host}:${port}`);
    } else {
      try {
        // Auto-provision real Ethereal SMTP account for instant out-of-the-box email delivery
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.isEthereal = true;
        this.logger.log(`✅ Nodemailer auto-provisioned live Ethereal SMTP: ${testAccount.user}`);
      } catch (e) {
        this.logger.warn(`Could not create Ethereal account, running in console logger mode: ${e.message}`);
      }
    }
  }

  getLastPreviewUrl(): string | null {
    return this.lastEmailPreviewUrl;
  }

  /**
   * Send booking confirmation email with embedded QR code ticket
   */
  async sendBookingConfirmation(
    toEmail: string,
    customerName: string,
    bookingReference: string,
    eventName: string,
    venueName: string,
    showTime: string,
    seats: string[],
    totalAmount: number,
    qrDataUrl: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from') || '"ShowReserve Tickets" <tickets@showreserve.com>';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
          <h1 style="color: #22c55e; margin: 0; font-size: 24px;">🎟️ Booking Confirmed!</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Your tickets for <strong>${eventName}</strong> are secured.</p>
        </div>

        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Booking Reference:</td>
              <td style="font-weight: bold; color: #38bdf8; text-align: right;">${bookingReference}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Attendee:</td>
              <td style="font-weight: bold; text-align: right;">${customerName}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Event:</td>
              <td style="font-weight: bold; text-align: right;">${eventName}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Venue:</td>
              <td style="font-weight: bold; text-align: right;">${venueName}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Date & Time:</td>
              <td style="font-weight: bold; text-align: right;">${showTime}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Seats:</td>
              <td style="font-weight: bold; color: #22c55e; text-align: right;">${seats.join(', ')}</td>
            </tr>
            <tr style="border-top: 1px solid #334155;">
              <td style="color: #94a3b8; padding: 12px 0 6px 0;">Total Paid:</td>
              <td style="font-weight: bold; font-size: 18px; color: #22c55e; text-align: right; padding-top: 12px;">$${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; background: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #0f172a; font-weight: bold; margin-bottom: 12px; margin-top: 0;">Scan at the Gate</p>
          <img src="${qrDataUrl}" alt="Booking QR Ticket" style="width: 200px; height: 200px;" />
          <p style="color: #64748b; font-size: 12px; margin-top: 8px; margin-bottom: 0;">Reference: ${bookingReference}</p>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 16px;">
          <p>Thank you for using ShowReserve. Enjoy the experience!</p>
        </div>
      </div>
    `;

    this.logger.log(`\n========================================\n[EMAIL DISPATCH] Booking Confirmation to ${toEmail}\nRef: ${bookingReference} | Event: ${eventName} | Seats: ${seats.join(', ')}\n========================================`);

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject: `Booking Confirmed: ${eventName} [${bookingReference}]`,
          html: htmlContent,
        });

        if (this.isEthereal) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            this.lastEmailPreviewUrl = previewUrl as string;
            this.logger.log(`\n✨ LIVE EMAIL PREVIEW LINK (Click to view full email in browser):\n➡️ ${previewUrl}\n`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to send email via SMTP transporter: ${err.message}`);
      }
    }
  }

  /**
   * Send Waitlist Offer notification with time-limited acceptance link
   */
  async sendWaitlistOffer(
    toEmail: string,
    customerName: string,
    eventName: string,
    seatNumber: string,
    category: string,
    expiresAt: Date,
    offerToken: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from') || '"ShowReserve Tickets" <tickets@showreserve.com>';
    const frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:5173';
    const claimUrl = `${frontendUrl}/waitlist-claim?token=${offerToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
          <h1 style="color: #eab308; margin: 0; font-size: 24px;">🎉 A Seat Just Opened Up!</h1>
          <p style="color: #94a3b8; margin-top: 8px;">You're next on the waitlist for <strong>${eventName}</strong>.</p>
        </div>

        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin-top: 0; color: #e2e8f0;">Hello ${customerName},</p>
          <p style="color: #94a3b8;">A <strong>${category}</strong> seat (<strong>${seatNumber}</strong>) has become available due to a cancellation.</p>
          <p style="color: #f87171; font-weight: bold;">⚠️ This offer expires at: ${expiresAt.toLocaleTimeString()} (${expiresAt.toLocaleDateString()})</p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${claimUrl}" style="display: inline-block; background: #22c55e; color: #000000; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">Claim Your Ticket Now ⚡</a>
          <p style="color: #64748b; font-size: 12px; margin-top: 12px;">Or open this link: <a href="${claimUrl}" style="color: #38bdf8;">${claimUrl}</a></p>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 16px;">
          <p>If you do not claim this seat before it expires, it will be offered to the next fan in line.</p>
        </div>
      </div>
    `;

    this.logger.log(`\n========================================\n[EMAIL DISPATCH] Waitlist Offer to ${toEmail}\nEvent: ${eventName} | Seat: ${seatNumber} | Claim URL: ${claimUrl}\n========================================`);

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject: `⚡ Ticket Available: ${eventName} [Action Required]`,
          html: htmlContent,
        });

        if (this.isEthereal) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            this.lastEmailPreviewUrl = previewUrl as string;
            this.logger.log(`\n✨ LIVE EMAIL PREVIEW LINK (Click to view full email in browser):\n➡️ ${previewUrl}\n`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to send email via SMTP transporter: ${err.message}`);
      }
    }
  }

  /**
   * Send cancellation confirmation email
   */
  async sendCancellationNotification(
    toEmail: string,
    customerName: string,
    bookingReference: string,
    eventName: string,
    seats: string[],
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from') || '"ShowReserve Tickets" <tickets@showreserve.com>';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
          <h1 style="color: #f87171; margin: 0; font-size: 24px;">Booking Cancelled</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Reference: <strong>${bookingReference}</strong></p>
        </div>

        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin-top: 0; color: #e2e8f0;">Hello ${customerName},</p>
          <p style="color: #94a3b8;">Your booking for <strong>${eventName}</strong> (Seats: <strong>${seats.join(', ')}</strong>) has been cancelled.</p>
          <p style="color: #22c55e; font-weight: bold;">Status: Released to queue / refunded</p>
        </div>
      </div>
    `;

    this.logger.log(`\n========================================\n[EMAIL DISPATCH] Cancellation Confirmation to ${toEmail}\nRef: ${bookingReference} | Event: ${eventName}\n========================================`);

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject: `Booking Cancelled: ${bookingReference}`,
          html: htmlContent,
        });

        if (this.isEthereal) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            this.lastEmailPreviewUrl = previewUrl as string;
            this.logger.log(`\n✨ LIVE EMAIL PREVIEW LINK (Click to view full email in browser):\n➡️ ${previewUrl}\n`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to send email via SMTP transporter: ${err.message}`);
      }
    }
  }
}
