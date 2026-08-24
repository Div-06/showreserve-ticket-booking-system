import { QrService, QRPayload } from '../src/qr/qr.service';
import { ConfigService } from '@nestjs/config';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

async function runQRScannerVerificationTest() {
  console.log('=====================================================');
  console.log('🔍 STARTING QR BARCODE SCAN & SIGNATURE VERIFICATION');
  console.log('=====================================================');

  const configService = new ConfigService({
    qr: { secret: 'test_qr_secure_hmac_secret_12345' },
  });
  const qrService = new QrService(configService);

  const testBookingRef = 'TKT-9E4B27C1';
  const testShowId = 'show-uuid-448c';
  const testEventName = 'Interstellar: 10th Anniversary IMAX';
  const testSeats = ['A10', 'A11', 'A12'];

  console.log(`📌 Step 1: Generating signed QR Code...`);
  console.log(`   - Booking Ref: ${testBookingRef}`);
  console.log(`   - Event: ${testEventName}`);
  console.log(`   - Seats: ${testSeats.join(', ')}`);

  const qrDataUrl = await qrService.generateTicketQR(
    testBookingRef,
    testShowId,
    testEventName,
    testSeats,
  );

  console.log(`   - Generated Data URL Length: ${qrDataUrl.length} chars`);

  // 2. Decode base64 PNG data into raw image bytes
  console.log(`\n📌 Step 2: Decoding PNG image pixel matrix...`);
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const png = PNG.sync.read(imageBuffer);

  console.log(`   - Image Dimensions: ${png.width}x${png.height} px`);
  console.log(`   - Total Raw Pixel Bytes: ${png.data.length} bytes`);

  // 3. Scan barcode matrix with QR Code Reader engine (jsQR)
  console.log(`\n📌 Step 3: Optical barcode recognition (jsQR scan)...`);
  const qrCode = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  if (!qrCode || !qrCode.data) {
    throw new Error('Failed to optically detect or scan QR Code from generated image');
  }

  console.log(`   - Scanned Raw QR String Content:`);
  console.log(`     ${qrCode.data}`);

  // 4. Parse payload JSON
  const decodedPayload: QRPayload = JSON.parse(qrCode.data);
  console.log(`\n🔍 Step 4: Parsed Ticket Payload Elements:`);
  console.log(`   - bookingReference: "${decodedPayload.bookingReference}"`);
  console.log(`   - showId: "${decodedPayload.showId}"`);
  console.log(`   - eventName: "${decodedPayload.eventName}"`);
  console.log(`   - seats: [${decodedPayload.seats.join(', ')}]`);
  console.log(`   - issuedAt: "${decodedPayload.issuedAt}"`);
  console.log(`   - HMAC-SHA256 signature: "${decodedPayload.signature}"`);

  // 5. Verify cryptographic HMAC signature
  console.log(`\n📌 Step 5: Cryptographic Signature Integrity Check...`);
  const isSignatureAuthentic = qrService.verifyPayload(decodedPayload);
  console.log(`   - Signature Verification Result: ${isSignatureAuthentic ? 'VALID ✅' : 'INVALID ❌'}`);

  // 6. Test Tampering Detection (Anti-counterfeiting verification)
  console.log(`\n🛡️ Step 6: Anti-Tampering Security Check...`);
  const tamperedPayload: QRPayload = {
    ...decodedPayload,
    seats: ['VIP-99'], // Attempted counterfeit seat alteration
  };
  const isTamperedValid = qrService.verifyPayload(tamperedPayload);
  console.log(`   - Tampered Payload Signature Result: ${isTamperedValid ? 'FAILED TO DETECT TAMPER ❌' : 'TAMPER DETECTED & REJECTED ✅'}`);

  if (
    isSignatureAuthentic &&
    !isTamperedValid &&
    decodedPayload.bookingReference === testBookingRef &&
    decodedPayload.seats.join(',') === testSeats.join(',')
  ) {
    console.log('\n=====================================================');
    console.log('🎉 QR CODE SCAN & HMAC SIGNATURE TEST PASSED 100%!');
    console.log('   Optical scan extracted exact JSON payload.');
    console.log('   HMAC-SHA256 signature passed verification.');
    console.log('   Anti-tampering security rejected counterfeit edits.');
    console.log('=====================================================\n');
    process.exit(0);
  } else {
    console.error('\n❌ QR TEST FAILED');
    process.exit(1);
  }
}

runQRScannerVerificationTest().catch((err) => {
  console.error('Fatal QR test error:', err);
  process.exit(1);
});
