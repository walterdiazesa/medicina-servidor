import nodemailer from "nodemailer";

// Templates TailwindCSS parser https://play.tailwindcss.com/
// Templates Mail parser (Maizzle) https://www.youtube.com/watch?v=AQIwyLXSXbo&ab_channel=VictorYoalli

export default nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAILER_USERNAME.trim().split("|")[0],
    pass: process.env.MAILER_PASSWORD.trim(),
  },
});
