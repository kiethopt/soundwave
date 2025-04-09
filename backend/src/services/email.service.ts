import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
// const EMAIL_USER = process.env.EMAIL_USER;
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

// --- Nodemailer Configuration ---
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'SoundWave';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;

// --- BEGIN: Fixed information for the new template ---
const SOUNDWAVE_LOGO_URL =
  'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743396192/fcazc9wdyqvaz1c3xwg7.png';
const BRAND_COLOR_PRIMARY = '#A57865'; // Brown color from footer decoration
const BACKGROUND_DARK = '#1a1a1a';
const BACKGROUND_LIGHT = '#f9f9f9';
const TEXT_LIGHT = '#ffffff';
const TEXT_DARK = '#333333';
const TEXT_MUTED = '#cccccc';
const FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
// --- END: Fixed information for the new template ---

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Add TLS configuration if needed (e.g., for self-signed certs)
    // tls: {
    //   rejectUnauthorized: false
    // }
  });

  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Nodemailer transporter verification failed:', error);
      transporter = null; // Disable transporter on verification failure
    } else {
      console.log('✅ Nodemailer transporter is ready to send emails.');
    }
  });
} else {
  console.warn(
    'SMTP configuration is incomplete (HOST, USER, or PASS missing). Email notifications will be disabled.'
  );
}

// Remove SendGrid specific checks
// if (!SENDGRID_API_KEY) { ... }
// if (!EMAIL_USER) { ... }

// Define type for email options
interface EmailOptions {
  to: string; // Required
  subject: string;
  html: string;
  text?: string; // Fallback plain text
}

/**
 * Send an email using Nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  if (!transporter) {
    console.error(
      'Nodemailer transporter is not configured or failed verification. Cannot send email.'
    );
    return false;
  }

  const plainText =
    options.text ||
    options.html
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`, // Sender address (use configured name and email)
    to: options.to, // List of receivers
    subject: options.subject, // Subject line
    text: plainText, // Plain text body
    html: options.html, // HTML body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Email sent successfully to ${options.to} with subject "${options.subject}". Message ID: ${info.messageId}`
    );
    return true;
  } catch (error: any) {
    console.error(`Error sending email to ${options.to} via Nodemailer:`, error);
    // Log specific Nodemailer error details if available
    if (error.responseCode) {
      console.error(`Nodemailer Error Response Code: ${error.responseCode}`);
    }
    if (error.response) {
      console.error(`Nodemailer Error Response: ${error.response}`);
    }
    return false;
  }
};

/**
 * Create a complete HTML email template with standard header and footer.
 */
const createRichHtmlTemplate = (
  title: string,
  mainContentHtml: string,
  recipientEmail: string,
  coverImageUrl?: string | null,
  actionLink?: string,
  actionText?: string
): string => {
  const currentYear = new Date().getFullYear();
  const actionButtonHtml =
    actionLink && actionText
      ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionLink}" target="_blank" style="display: inline-block; background-color: #A57865; color: ${TEXT_LIGHT}; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">${actionText}</a>
      </div>
    `
      : ''; // Use new button color #A57865

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: ${FONT_FAMILY}; background-color: ${BACKGROUND_LIGHT}; color: ${TEXT_DARK};">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-spacing: 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 0;">
            <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
              <tr>
                <td style="background-color: ${BACKGROUND_DARK}; padding: 20px 0; text-align: center;">
                  <a href="${FRONTEND_URL}" target="_blank">
                    <img src="${SOUNDWAVE_LOGO_URL}" alt="SoundWave" width="150" style="display: block; margin: 0 auto; border: 0;">
                   </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff;">
            ${coverImageUrl
      ? `
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${actionLink || '#'
      }" target="_blank"> <img src="${coverImageUrl}" alt="${title}" style="max-width: 200px; height: auto; border-radius: 4px; display: inline-block; border: 1px solid #eee;">
                </a>
              </div>
            `
      : ''
    }
            ${mainContentHtml}
            ${actionButtonHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 0;">
            <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
              <tr>
                <td style="background-color: ${BACKGROUND_DARK}; padding: 30px; text-align: center;">
                  <div style="margin-bottom: 20px; font-size: 0;">
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: ${BRAND_COLOR_PRIMARY}; margin: 0 5px; border-radius: 50%;"></span>
                    <span style="display: inline-block; width: 8px; height: 15px; background-color: ${BRAND_COLOR_PRIMARY}; margin: 0 5px; border-radius: 4px;"></span>
                    <span style="display: inline-block; width: 8px; height: 12px; background-color: ${BRAND_COLOR_PRIMARY}; margin: 0 5px; border-radius: 4px;"></span>
                    <span style="display: inline-block; width: 8px; height: 18px; background-color: ${BRAND_COLOR_PRIMARY}; margin: 0 5px; border-radius: 4px;"></span>
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: ${BRAND_COLOR_PRIMARY}; margin: 0 5px; border-radius: 50%;"></span>
                  </div>
                  <p style="margin: 0 0 10px; font-size: 12px; line-height: 1.6; color: #bbbbbb;">This email was sent to ${recipientEmail}</p>
                  <p style="margin: 0 0 15px; font-size: 12px; line-height: 1.6; color: ${TEXT_MUTED};">This is an automated email, please do not reply.</p>
                  <p style="margin: 0; font-size: 12px; line-height: 1.6; color: ${TEXT_MUTED};">© ${currentYear} SoundWave. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
};

/**
 * Create email content for a new follower notification
 */
export const createNewFollowerEmail = (
  to: string,
  followerName: string,
  followedEntityName: string,
  profileLink: string
): EmailOptions => {
  const subject = `${followerName} has started following you on SoundWave!`;
  const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">New Follower!</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${followedEntityName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Good news! <strong>${followerName}</strong> has just started following you on SoundWave.</p>
    `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    undefined, // No cover image for this notification
    profileLink,
    `View ${followerName}'s profile`
  );
  return { to, subject, html };
};

/**
 * Create email content for artist request approval notification
 */
export const createArtistRequestApprovedEmail = (
  to: string,
  userName: string
): EmailOptions => {
  const subject =
    'Congratulations! Your request to become an Artist has been approved';
  const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Artist Request Approved!</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Congratulations! Your request to become an artist on SoundWave has been approved by an administrator. You can now start uploading your works.</p>
    `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    undefined, // No cover image
    `${FRONTEND_URL}/studio/dashboard`,
    'Go to Studio'
  );
  return { to, subject, html };
};

/**
 * Create email content for artist request rejection notification
 */
export const createArtistRequestRejectedEmail = (
  to: string,
  userName: string,
  reason?: string
): EmailOptions => {
  const subject = 'Update on Your Artist Request';
  const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
  const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Artist Request Not Approved</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We regret to inform you that your request to become an artist on SoundWave has not been approved this time.${reasonText}</p>
      <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">You can contact support if you have any questions.</p>
    `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to
    // No cover image, no button
  );
  return { to, subject, html };
};

/**
 * Create email content for new track/album release notification
 */
export const createNewReleaseEmail = (
  to: string,
  artistName: string,
  releaseType: 'track' | 'album',
  releaseTitle: string,
  releaseLink: string,
  coverImageUrl?: string | null
): EmailOptions => {
  const typeText = releaseType === 'album' ? 'new album' : 'new track';
  const subject = `${artistName} has released a ${typeText}: ${releaseTitle}`;
  const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">${typeText.charAt(0).toUpperCase() + typeText.slice(1)
    } from ${artistName}!</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello,</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">The artist <strong>${artistName}</strong> you follow has just released a ${typeText} <strong>"${releaseTitle}"</strong> on SoundWave.</p>
  `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    coverImageUrl,
    releaseLink,
    `Listen to the ${releaseType}`
  );
  return { to, subject, html };
};

/**
 * Create email content for account reactivation notification
 */
export const createAccountActivatedEmail = (
  to: string,
  userName: string,
  accountType: 'user' | 'artist' // Distinguish account type
): EmailOptions => {
  const accountTypeText = accountType === 'artist' ? 'artist' : 'user';
  const subject = `Your SoundWave ${accountTypeText} account has been reactivated`;
  const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Account Reactivated</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Your ${accountTypeText} account on SoundWave has been reactivated by an administrator. You can now log in and continue using the service.</p>
  `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    undefined, // No cover image
    `${FRONTEND_URL}/login`, // Link to login page
    'Log in now'
  );
  return { to, subject, html };
};

/**
 * Create email content for account deactivation notification
 */
export const createAccountDeactivatedEmail = (
  to: string,
  userName: string,
  accountType: 'user' | 'artist',
  reason?: string
): EmailOptions => {
  const accountTypeText = accountType === 'artist' ? 'artist' : 'user';
  const subject = `Notice: Your SoundWave ${accountTypeText} account has been deactivated`;
  const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
  const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Account Deactivated</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We are informing you that your ${accountTypeText} account on SoundWave has been deactivated by an administrator.${reasonText}</p>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Please contact support if you believe this is a mistake or need more information.</p>
  `;
  // Optionally add a link to a support contact page if available
  const html = createRichHtmlTemplate(subject, mainContentHtml, to);
  return { to, subject, html };
};

/**
 * Create email content for password reset request notification
 */
export const createPasswordResetEmail = (
  to: string,
  userName: string, // Add userName for greeting
  resetLink: string
): EmailOptions => {
  const subject = 'Your SoundWave Password Reset Request';
  // Main HTML content for the password reset email
  const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Reset Your Password</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We have received a request to reset the password for your SoundWave account. Use the button below to set a new password. This link is valid for 1 hour only.</p>
    <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">For security reasons, this request was recorded from your SoundWave account. The link will expire after 60 minutes.</p>
  `;

  // Call the common template
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    undefined,
    resetLink,
    'RESET PASSWORD'
  );

  return { to, subject, html };
};

/**
 * Create email content for welcome notification after registration
 */
export const createWelcomeEmail = (
  to: string,
  userName: string
): EmailOptions => {
  const subject = 'Welcome to SoundWave!';
  const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Welcome to SoundWave!</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Thank you for joining SoundWave! We're excited to have you on board.</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Start exploring our vast collection of music and create your own playlists.</p>
  `;
  const html = createRichHtmlTemplate(
    subject,
    mainContentHtml,
    to,
    undefined,
    `${FRONTEND_URL}/`,
    'Start Exploring'
  );
  return { to, subject, html };
};


