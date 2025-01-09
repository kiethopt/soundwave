import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load biến môi trường từ .env
dotenv.config();

const sendTestEmail = async () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'hoptkiet.17@gmail.com',
    subject: 'Test Email',
    text: 'This is a test email from my application.',
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully');
  } catch (error) {
    console.error('Error sending test email:', error);
  }
};

sendTestEmail();
