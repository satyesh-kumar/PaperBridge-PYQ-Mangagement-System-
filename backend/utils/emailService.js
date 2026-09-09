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

    // Format stars if provided
    const starStr = feedback.rating
      ? "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating) + ` (${feedback.rating}/5)`
      : "Not provided (optional)";

    // Submitter display
    const submitterName = feedback.anonymous ? "Anonymous Student" : (feedback.userNameSnapshot || feedback.studentName || "Registered Student");
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
                <td class="label">Student:</td>
                <td class="val">${submitterName}</td>
              </tr>
              <tr>
                <td class="label">Email:</td>
                <td class="val">${submitterEmail}</td>
              </tr>
              ${feedback.course ? `
              <tr>
                <td class="label">Course:</td>
                <td class="val">${feedback.course}</td>
              </tr>
              ` : ""}
              ${feedback.academicYear ? `
              <tr>
                <td class="label">Academic Year:</td>
                <td class="val">${feedback.academicYear}</td>
              </tr>
              ` : ""}
              <tr>
                <td class="label">Problem:</td>
                <td class="val"><strong>${feedback.problemType || feedback.feedbackType}</strong></td>
              </tr>
              ${feedback.subject ? `
              <tr>
                <td class="label">Subject:</td>
                <td class="val">${feedback.subject}</td>
              </tr>
              ` : ""}
              ${feedback.paperTitle ? `
              <tr>
                <td class="label">Paper:</td>
                <td class="val">${feedback.paperTitle}</td>
              </tr>
              ` : ""}
              ${feedback.rating ? `
              <tr>
                <td class="label">Rating:</td>
                <td class="val" style="color: #E5A93C; font-size: 15px;">${starStr}</td>
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
              <a href="${adminReviewUrl}" class="btn" target="_blank">Review Feedback →</a>
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
        subject: `New PaperBridge Feedback — ${feedback.referenceId}`,
        html: htmlBody,
      });

      console.log(`[EmailService] Feedback email dispatched to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[EmailService] SMTP not configured. Feedback notification simulated for admin <${adminEmail}>.`);
      console.log(`[EmailService] Reference: ${feedback.referenceId} | Problem: ${feedback.problemType || feedback.feedbackType}`);
      return { success: true, simulated: true };
    }
  } catch (err) {
    console.error("[EmailService] Failed to send feedback notification email:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an email notification to the administrator when a student requests a missing paper.
 */
export async function sendPaperRequestNotificationEmail(paperRequest, totalRequestCount = 1) {
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

    const adminReviewUrl = `${baseUrl}/admin?tab=feedback&filter=requests&id=${paperRequest._id}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px; color: #1A1614; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #EAE2D8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background: #1B3B4A; padding: 24px 32px; color: #FAF8F5; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
          .content { padding: 32px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #E0F2FE; color: #0369A1; margin-bottom: 16px; }
          .count-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
          .count-number { font-size: 22px; font-weight: 800; color: #B45309; }
          .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .info-table td { padding: 8px 0; border-bottom: 1px solid #F4EFEA; font-size: 13px; }
          .info-table td.label { font-weight: 600; color: #8C7862; width: 140px; }
          .info-table td.val { color: #1A1614; }
          .message-box { background: #FAF8F5; border-left: 4px solid #1B3B4A; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
          .btn-container { text-align: center; margin: 28px 0 12px; }
          .btn { background: #1B3B4A; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 13px; display: inline-block; }
          .footer { padding: 20px 32px; background: #FAF8F5; border-top: 1px solid #EAE2D8; text-align: center; font-size: 11px; color: #8C7862; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>📄 New Paper Request — PaperBridge</h1>
            <p>A student has requested a missing previous year question paper</p>
          </div>
          <div class="content">
            <span class="badge">Paper Request</span>

            <div class="count-box">
              <span style="font-size: 13px; color: #92400E; font-weight: 600;">Total Student Requests for this paper:</span>
              <span class="count-number">${totalRequestCount}</span>
            </div>

            <table class="info-table">
              <tr>
                <td class="label">Request ID:</td>
                <td class="val"><strong>${paperRequest.referenceId}</strong></td>
              </tr>
              <tr>
                <td class="label">Student:</td>
                <td class="val">${paperRequest.studentName || "Student"}</td>
              </tr>
              <tr>
                <td class="label">Email:</td>
                <td class="val">${paperRequest.studentEmail || "Not specified"}</td>
              </tr>
              <tr>
                <td class="label">Course:</td>
                <td class="val"><strong>${paperRequest.course}</strong></td>
              </tr>
              <tr>
                <td class="label">Academic Year:</td>
                <td class="val">${paperRequest.academicYear || "Not specified"}</td>
              </tr>
              <tr>
                <td class="label">Subject:</td>
                <td class="val"><strong>${paperRequest.subject}</strong></td>
              </tr>
              <tr>
                <td class="label">Paper/Exam Year:</td>
                <td class="val"><strong>${paperRequest.examYear}</strong> (${paperRequest.examType || "End Semester"})</td>
              </tr>
              <tr>
                <td class="label">Requested At:</td>
                <td class="val">${new Date(paperRequest.createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              </tr>
            </table>

            ${paperRequest.message ? `
              <p style="font-weight: 600; font-size: 13px; color: #4A3E31; margin-bottom: 6px;">Student Notes:</p>
              <div class="message-box">${paperRequest.message}</div>
            ` : ""}

            <div class="btn-container">
              <a href="${adminReviewUrl}" class="btn" target="_blank">View Request in Admin Console →</a>
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
        subject: `📄 New Paper Request — PaperBridge [${paperRequest.referenceId}]`,
        html: htmlBody,
      });

      console.log(`[EmailService] Paper request email dispatched to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[EmailService] SMTP not configured. Paper request simulated for admin <${adminEmail}>.`);
      console.log(`[EmailService] Reference: ${paperRequest.referenceId} | Paper: ${paperRequest.subject} ${paperRequest.examYear} | Count: ${totalRequestCount}`);
      return { success: true, simulated: true };
    }
  } catch (err) {
    console.error("[EmailService] Failed to send paper request notification email:", err.message);
    return { success: false, error: err.message };
  }
}
