"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPasswordResetEmail = exports.createAccountDeactivatedEmail = exports.createAccountActivatedEmail = exports.createNewReleaseEmail = exports.createArtistRequestRejectedEmail = exports.createArtistRequestApprovedEmail = exports.createNewFollowerEmail = exports.sendEmail = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const SOUNDWAVE_LOGO_URL = 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743396192/fcazc9wdyqvaz1c3xwg7.png';
const BRAND_COLOR_PRIMARY = '#A57865';
const BACKGROUND_DARK = '#1a1a1a';
const BACKGROUND_LIGHT = '#f9f9f9';
const TEXT_LIGHT = '#ffffff';
const TEXT_DARK = '#333333';
const TEXT_MUTED = '#cccccc';
const FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not set. Email notifications will be disabled.');
}
else {
    mail_1.default.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid configured.');
}
if (!EMAIL_USER) {
    console.warn('EMAIL_USER is not set. Emails might not be sent.');
}
const sendEmail = async (options) => {
    if (!SENDGRID_API_KEY || !EMAIL_USER) {
        console.error('SendGrid API Key or Sender Email not configured. Cannot send email.');
        return false;
    }
    const plainText = options.text ||
        options.html
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    const msg = {
        to: options.to,
        from: {
            name: 'SoundWave',
            email: EMAIL_USER,
        },
        subject: options.subject,
        html: options.html,
        text: plainText,
    };
    try {
        await mail_1.default.send(msg);
        console.log(`Email sent successfully to ${options.to} with subject "${options.subject}"`);
        return true;
    }
    catch (error) {
        console.error(`Error sending email to ${options.to}:`, error);
        if (error.response) {
            console.error('SendGrid Error Response:', error.response.body?.errors || error.response.body);
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
//# sourceMappingURL=email.service.js.map