"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = exports.createArtistRequestNotificationEmail = exports.createWelcomeEmail = exports.createPasswordResetEmail = exports.createAccountDeletedEmail = exports.createAccountDeactivatedEmail = exports.createAccountActivatedEmail = exports.createNewReleaseEmail = exports.createArtistRequestRejectedEmail = exports.createArtistRequestApprovedEmail = exports.createNewFollowerEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'SoundWave';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const SOUNDWAVE_LOGO_URL = 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743396192/fcazc9wdyqvaz1c3xwg7.png';
const BRAND_COLOR_PRIMARY = '#A57865';
const BACKGROUND_DARK = '#1a1a1a';
const BACKGROUND_LIGHT = '#f9f9f9';
const TEXT_LIGHT = '#ffffff';
const TEXT_DARK = '#333333';
const TEXT_MUTED = '#cccccc';
const FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
let transporter = null;
exports.transporter = transporter;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    exports.transporter = transporter = nodemailer_1.default.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Nodemailer transporter verification failed:', error);
            exports.transporter = transporter = null;
        }
        else {
            console.log('✅ Nodemailer transporter is ready to send emails.');
        }
    });
}
else {
    console.warn('SMTP configuration is incomplete (HOST, USER, or PASS missing). Email notifications will be disabled.');
}
const sendEmail = async (options) => {
    if (!transporter) {
        console.error('Nodemailer transporter is not configured or failed verification. Cannot send email.');
        return false;
    }
    const plainText = options.text ||
        options.html
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    const mailOptions = {
        from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: plainText,
        html: options.html,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.to} with subject "${options.subject}". Message ID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error(`Error sending email to ${options.to} via Nodemailer:`, error);
        if (error.responseCode) {
            console.error(`Nodemailer Error Response Code: ${error.responseCode}`);
        }
        if (error.response) {
            console.error(`Nodemailer Error Response: ${error.response}`);
        }
        return false;
    }
};
exports.sendEmail = sendEmail;
const createRichHtmlTemplate = (title, mainContentHtml, recipientEmail, coverImageUrl, actionLink, actionText) => {
    const currentYear = new Date().getFullYear();
    const actionButtonHtml = actionLink && actionText
        ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionLink}" target="_blank" style="display: inline-block; background-color: #A57865; color: ${TEXT_LIGHT}; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600; font-size: 16px; border: none; cursor: pointer;">${actionText}</a>
      </div>
    `
        : '';
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
                <a href="${actionLink || '#'}" target="_blank"> <img src="${coverImageUrl}" alt="${title}" style="max-width: 200px; height: auto; border-radius: 4px; display: inline-block; border: 1px solid #eee;">
                </a>
              </div>
            `
        : ''}
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
const createNewFollowerEmail = (to, followerName, followedEntityName, profileLink) => {
    const subject = `${followerName} has started following you on SoundWave!`;
    const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">New Follower!</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${followedEntityName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Good news! <strong>${followerName}</strong> has just started following you on SoundWave.</p>
    `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, profileLink, `View ${followerName}'s profile`);
    return { to, subject, html };
};
exports.createNewFollowerEmail = createNewFollowerEmail;
const createArtistRequestApprovedEmail = (to, userName) => {
    const subject = 'Congratulations! Your request to become an Artist has been approved';
    const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Artist Request Approved!</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Congratulations! Your request to become an artist on SoundWave has been approved by an administrator. You can now start uploading your works.</p>
    `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, `${FRONTEND_URL}/studio/dashboard`, 'Go to Studio');
    return { to, subject, html };
};
exports.createArtistRequestApprovedEmail = createArtistRequestApprovedEmail;
const createArtistRequestRejectedEmail = (to, userName, reason) => {
    const subject = 'Update on Your Artist Request';
    const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
    const mainContentHtml = `
      <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Artist Request Not Approved</h2>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We regret to inform you that your request to become an artist on SoundWave has not been approved this time.${reasonText}</p>
      <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">You can contact support if you have any questions.</p>
    `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to);
    return { to, subject, html };
};
exports.createArtistRequestRejectedEmail = createArtistRequestRejectedEmail;
const createNewReleaseEmail = (to, artistName, releaseType, releaseTitle, releaseLink, coverImageUrl) => {
    const typeText = releaseType === 'album' ? 'new album' : 'new track';
    const subject = `${artistName} has released a ${typeText}: ${releaseTitle}`;
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">${typeText.charAt(0).toUpperCase() + typeText.slice(1)} from ${artistName}!</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello,</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">The artist <strong>${artistName}</strong> you follow has just released a ${typeText} <strong>"${releaseTitle}"</strong> on SoundWave.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, coverImageUrl, releaseLink, `Listen to the ${releaseType}`);
    return { to, subject, html };
};
exports.createNewReleaseEmail = createNewReleaseEmail;
const createAccountActivatedEmail = (to, userName, accountType) => {
    const accountTypeText = accountType === 'artist' ? 'artist' : 'user';
    const subject = `Your SoundWave ${accountTypeText} account has been reactivated`;
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Account Reactivated</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Your ${accountTypeText} account on SoundWave has been reactivated by an administrator. You can now log in and continue using the service.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, `${FRONTEND_URL}/login`, 'Log in now');
    return { to, subject, html };
};
exports.createAccountActivatedEmail = createAccountActivatedEmail;
const createAccountDeactivatedEmail = (to, userName, accountType, reason) => {
    const accountTypeText = accountType === 'artist' ? 'artist' : 'user';
    const subject = `Notice: Your SoundWave ${accountTypeText} account has been deactivated`;
    const reasonText = reason ? `<br><br><strong>Reason:</strong> ${reason}` : '';
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Account Deactivated</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We are informing you that your ${accountTypeText} account on SoundWave has been deactivated by an administrator.${reasonText}</p>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Please contact support if you believe this is a mistake or need more information.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to);
    return { to, subject, html };
};
exports.createAccountDeactivatedEmail = createAccountDeactivatedEmail;
const createAccountDeletedEmail = (to, userName, reason) => {
    const subject = 'Your SoundWave account has been deleted';
    const reasonText = reason ? `<p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;"><strong>Reason:</strong> ${reason}</p>` : '';
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Account Deleted</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">This email confirms that your SoundWave account has been permanently deleted by an administrator.</p>
    ${reasonText}
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">All associated data, including playlists and listening history, has been removed.</p>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">If you believe this was done in error, please contact our support team.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to);
    return { to, subject, html };
};
exports.createAccountDeletedEmail = createAccountDeletedEmail;
const createPasswordResetEmail = (to, userName, resetLink) => {
    const subject = 'Your SoundWave Password Reset Request';
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Reset Your Password</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">We have received a request to reset the password for your SoundWave account. Use the button below to set a new password. This link is valid for 1 hour only.</p>
    <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">For security reasons, this request was recorded from your SoundWave account. The link will expire after 60 minutes.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, resetLink, 'RESET PASSWORD');
    return { to, subject, html };
};
exports.createPasswordResetEmail = createPasswordResetEmail;
const createWelcomeEmail = (to, userName) => {
    const subject = 'Welcome to SoundWave!';
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">Welcome to SoundWave!</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Hello ${userName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Thank you for joining SoundWave! We're excited to have you on board.</p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">Start exploring our vast collection of music and create your own playlists.</p>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, `${FRONTEND_URL}/`, 'Start Exploring');
    return { to, subject, html };
};
exports.createWelcomeEmail = createWelcomeEmail;
const createArtistRequestNotificationEmail = (to, artistName, userName, userId, artistProfileId) => {
    const subject = `New Artist Request: ${artistName}`;
    const actionLink = `${FRONTEND_URL}/admin/artist-requests/${userId}`;
    const mainContentHtml = `
    <h2 style="color: ${TEXT_DARK}; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-align: center;">New Artist Request</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK}; text-align: center;">A new artist request has been submitted and requires review:</p>
    <div style="margin: 0 0 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
      <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK};">
        <strong>Artist Name:</strong> ${artistName}
      </p>
      <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: ${TEXT_DARK};">
        <strong>Requested by:</strong> ${userName} (ID: ${userId})
      </p>
    </div>
  `;
    const html = createRichHtmlTemplate(subject, mainContentHtml, to, undefined, actionLink, 'Review Request');
    return { to, subject, html };
};
exports.createArtistRequestNotificationEmail = createArtistRequestNotificationEmail;
//# sourceMappingURL=email.service.js.map