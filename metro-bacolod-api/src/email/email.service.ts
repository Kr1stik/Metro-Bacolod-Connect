import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not set. Email sending will be disabled.');
    }
    this.resend = new Resend(apiKey || '');
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Metro Bacolod Connect <noreply@metrobcd.cosedevs.com>';
  }

  /**
   * Send verification approval email to the agent/seller
   */
  async sendVerificationApprovalEmail(
    recipientEmail: string,
    recipientName: string,
    role: string,
  ): Promise<void> {
    const dashboardUrl = process.env.FRONTEND_URL || 'https://metrobcd.cosedevs.com';

    const html = this.buildApprovalEmailHtml(recipientName, role, dashboardUrl);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [recipientEmail],
        subject: `Your ${role} Account Has Been Verified — Metro Bacolod Connect`,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send approval email to ${recipientEmail}:`, error);
        throw new Error(`Email send failed: ${error.message}`);
      }

      this.logger.log(`Approval email sent to ${recipientEmail} (ID: ${data?.id})`);
    } catch (err) {
      this.logger.error(`Email delivery error for ${recipientEmail}:`, err);
      // Don't throw — email failure should not block verification
    }
  }

  /**
   * Send verification rejection email to the agent/seller
   */
  async sendVerificationRejectionEmail(
    recipientEmail: string,
    recipientName: string,
    role: string,
    reason?: string,
  ): Promise<void> {
    const html = this.buildRejectionEmailHtml(recipientName, role, reason);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [recipientEmail],
        subject: `Verification Update — Metro Bacolod Connect`,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send rejection email to ${recipientEmail}:`, error);
        throw new Error(`Email send failed: ${error.message}`);
      }

      this.logger.log(`Rejection email sent to ${recipientEmail} (ID: ${data?.id})`);
    } catch (err) {
      this.logger.error(`Email delivery error for ${recipientEmail}:`, err);
    }
  }

  // ─────────────── Email Templates ───────────────

  private buildApprovalEmailHtml(name: string, role: string, dashboardUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', 'Inter', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 40px 40px 32px; text-align: center;">
              <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px; font-weight: 800; color: #ffffff; line-height: 56px;">M</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Metro Bacolod Connect</h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">Bacolod's Trusted Real Estate Platform</p>
            </td>
          </tr>

          <!-- Success Badge -->
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <div style="width: 72px; height: 72px; background: #ecfdf5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 36px; line-height: 72px;">&#10003;</span>
              </div>
              <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #111827;">You're Verified!</h2>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Congratulations, <strong style="color: #111827;">${name}</strong>
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.7;">
                  Your <strong style="color: #111827;">${role}</strong> account has been reviewed and approved by our admin team. You now have full access to all ${role.toLowerCase()} features on Metro Bacolod Connect.
                </p>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                  <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">What you can now do:</p>
                  <table cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Create and publish property listings
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Appear in the Professionals directory
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Receive inquiries from potential buyers
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Display your verified badge on your profile
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <a href="${dashboardUrl}/dashboard" target="_blank" style="display: inline-block; background: #111827; color: #ffffff; padding: 14px 40px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
                Go to Dashboard
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                This is an automated notification from Metro Bacolod Connect.
              </p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af;">
                Bacolod City, Negros Occidental, Philippines
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                &copy; ${new Date().getFullYear()} Metro Bacolod Connect. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildRejectionEmailHtml(name: string, role: string, reason?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', 'Inter', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 40px 40px 32px; text-align: center;">
              <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px; font-weight: 800; color: #ffffff; line-height: 56px;">M</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Metro Bacolod Connect</h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">Bacolod's Trusted Real Estate Platform</p>
            </td>
          </tr>

          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <div style="width: 72px; height: 72px; background: #fef2f2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 36px; line-height: 72px;">&#9888;</span>
              </div>
              <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #111827;">Verification Requires Attention</h2>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                Hi <strong style="color: #111827;">${name}</strong>,
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.7;">
                  We've reviewed your <strong style="color: #111827;">${role}</strong> verification request, and unfortunately, we were unable to approve it at this time.
                </p>
                
                ${reason ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                  <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Reason</p>
                  <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">${reason}</p>
                </div>
                ` : ''}
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                  <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #111827;">What you can do:</p>
                  <table cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #3b82f6; margin-right: 8px;">&#8226;</span> Review and update your submitted documents
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #3b82f6; margin-right: 8px;">&#8226;</span> Ensure your government ID and PRC license are clear and valid
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                        <span style="color: #3b82f6; margin-right: 8px;">&#8226;</span> Re-submit for verification through your profile settings
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">
                Need help? Contact us at <a href="mailto:support@metrobacolodconnect.com" style="color: #3b82f6; text-decoration: none; font-weight: 600;">support@metrobacolodconnect.com</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                This is an automated notification from Metro Bacolod Connect.
              </p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af;">
                Bacolod City, Negros Occidental, Philippines
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                &copy; ${new Date().getFullYear()} Metro Bacolod Connect. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
