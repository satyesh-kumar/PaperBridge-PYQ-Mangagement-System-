import nodemailer from "nodemailer";

/**
 * Sends an email notification to the administrator when a new feedback is submitted.
 * Designed with fault tolerance: never throws, logs failures securely, returns execution status.
 */
export async function sendFeedbackNotificationEmail(feedback) {
  try {
    const adminEmail =
      process.env.FEEDBACK_ADMIN_EMAIL ||
      (process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",")[0].trim() : null) ||
      "admin@paperbridge.com";

    const emailFrom =
      process.env.EMAIL_FROM || '"PaperBridge Platform" <notifications@paperbridge.com>';

    const baseUrl =
      process.env.APP_BASE_URL ||
      (process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",")[0].trim() : "https://paper-bridge-pyq-mangagement-system.vercel.app");

    const adminReviewUrl = `${baseUrl}/admin?tab=feedback&id=${feedback._id}`;

    // Format stars
    const starStr = "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating);

    // Submitter display
    const submitterName = feedback.anonymous ? "Anonymous Student" : (feedback.userNameSnapshot || "Registered User");
    const submitterEmail = feedback.anonymous ? "[Hidden - Anonymous Submission]" : (feedback.userEmailSnapshot || "Not specified");

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px; color: #1A1614; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #EAE2D8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background: #4A2E1B; padding: 24px 32px; color: #FAF8F5; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
          .content { padding: 32px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #F4EFEA; color: #8C6239; margin-bottom: 16px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .info-table td { padding: 8px 0; border-bottom: 1px solid #F4EFEA; font-size: 13px; }
          .info-table td.label { font-weight: 600; color: #8C7862; width: 140px; }
          .info-table td.val { color: #1A1614; }
          .message-box { background: #FAF8F5; border-left: 4px solid #8C6239; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
          .btn-container { text-align: center; margin: 28px 0 12px; }
          .btn { background: #4A2E1B; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 13px; display: inline-block; }
          .footer { padding: 20px 32px; background: #FAF8F5; border-top: 1px solid #EAE2D8; text-align: center; font-size: 11px; color: #8C7862; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>PaperBridge — New Feedback Submitted</h1>
            <p>A new student community feedback has been recorded</p>
          </div>
          <div class="content">
            <span class="badge">${feedback.feedbackType}</span>
            <table class="info-table">
              <tr>
                <td class="label">Feedback ID:</td>
                <td class="val"><strong>${feedback.referenceId}</strong></td>
              </tr>
              <tr>
                <td class="label">Rating:</td>
                <td class="val" style="color: #E5A93C; font-size: 15px;">${starStr} (${feedback.rating}/5)</td>
              </tr>
              <tr>
                <td class="label">Submitted By:</td>
                <td class="val">${submitterName}</td>
              </tr>
              <tr>
                <td class="label">Email:</td>
                <td class="val">${submitterEmail}</td>
              </tr>
              ${feedback.course ? `
              <tr>
                <td class="label">Course:</td>
                <td class="val">${feedback.course} ${feedback.department ? `(${feedback.department})` : ""}</td>
              </tr>
              ` : ""}
              ${feedback.academicYear ? `
              <tr>
                <td class="label">Academic Year:</td>
                <td class="val">${feedback.academicYear} ${feedback.semester ? `- Semester ${feedback.semester}` : ""}</td>
              </tr>
              ` : ""}
              ${feedback.relatedTo ? `
              <tr>
                <td class="label">Related To:</td>
                <td class="val">${feedback.relatedTo}</td>
              </tr>
              ` : ""}
              <tr>
                <td class="label">Submitted At:</td>
                <td class="val">${new Date(feedback.createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              </tr>
            </table>

            <p style="font-weight: 600; font-size: 13px; color: #4A3E31; margin-bottom: 6px;">Message Content:</p>
            <div class="message-box">${feedback.message}</div>

            <div class="btn-container">
              <a href="${adminReviewUrl}" class="btn" target="_blank">Review Feedback in Admin Console →</a>
            </div>
          </div>
          <div class="footer">
            PaperBridge Past Year Question Paper & Study Material Archive<br/>
            Automated system notification. Please do not reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    // If SMTP environment variables are configured, send real email
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: emailFrom,
        to: adminEmail,
        subject: `New Feedback Submitted [${feedback.referenceId}] — PaperBridge`,
        html: htmlBody,
      });

      console.log(`[EmailService] Notification sent successfully to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      // SMTP not configured; log payload securely so no notification is silently lost
      console.log(`[EmailService] SMTP not configured. Notification simulated for admin <${adminEmail}>.`);
      console.log(`[EmailService] Reference: ${feedback.referenceId} | Type: ${feedback.feedbackType} | Rating: ${feedback.rating}/5`);
      return { success: true, simulated: true };
    }
  } catch (err) {
    console.error("[EmailService] Failed to send feedback notification email:", err.message);
    // Fault-tolerant return, never throw
    return { success: false, error: err.message };
  }
}
