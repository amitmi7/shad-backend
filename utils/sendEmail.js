const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

exports.sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: config.emailUser,
    to,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
};
