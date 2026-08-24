import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface QRPayload {
  bookingReference: string;
  showId: string;
  eventName: string;
  seats: string[];
  issuedAt: string;
  signature: string;
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly qrSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.qrSecret = this.configService.get<string>('qr.secret') || 'default_qr_secret_key_88';
  }

  /**
   * Generates an HMAC-SHA256 signature for a booking payload
   */
  signPayload(bookingReference: string, showId: string, seatLabels: string[]): string {
    const raw = `${bookingReference}:${showId}:${seatLabels.sort().join(',')}`;
    return crypto.createHmac('sha256', this.qrSecret).update(raw).digest('hex');
  }

  /**
   * Validates if a QR payload signature is authentic
   */
  verifyPayload(payload: QRPayload): boolean {
    const expected = this.signPayload(payload.bookingReference, payload.showId, payload.seats);
    return crypto.timingSafeEqual(Buffer.from(payload.signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  /**
   * Generates a secure QR code image as Base64 Data URL
   */
  async generateTicketQR(
    bookingReference: string,
    showId: string,
    eventName: string,
    seatLabels: string[],
  ): Promise<string> {
    const signature = this.signPayload(bookingReference, showId, seatLabels);
    const payload: QRPayload = {
      bookingReference,
      showId,
      eventName,
      seats: seatLabels,
      issuedAt: new Date().toISOString(),
      signature,
    };

    const payloadJson = JSON.stringify(payload);
    try {
      const qrDataUrl = await QRCode.toDataURL(payloadJson, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      });
      return qrDataUrl;
    } catch (err) {
      this.logger.error('Error generating QR code', err);
      throw err;
    }
  }
}
