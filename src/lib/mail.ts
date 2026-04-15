import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@first-friends.jp";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "First Friends App";

/**
 * Send scheduling request email to visitor
 */
export async function sendSchedulingRequest(params: {
  to: string;
  visitorName: string;
  hostName: string;
  hostCompany: string;
  hostEmail: string;
  bookingUrl: string;
}) {
  return resend.emails.send({
    from: `${appName} <${fromEmail}>`,
    to: params.to,
    subject: `アポイントメント調整依頼[${params.hostCompany}]`,
    html: buildRequestEmailHtml(params),
  });
}

/**
 * Send confirmation email to all participants
 */
export async function sendConfirmationEmail(params: {
  to: string[];
  hostName: string;
  hostCompany: string;
  hostEmail: string;
  visitors: { name: string; company: string; email: string }[];
  date: string;
  time: string;
  meetUrl: string;
}) {
  const promises = params.to.map((email) =>
    resend.emails.send({
      from: `${appName} <${fromEmail}>`,
      to: email,
      subject: `アポイントメントが確定しました[${params.hostCompany}]`,
      html: buildConfirmEmailHtml(params),
    })
  );
  return Promise.all(promises);
}

/**
 * Send "all votes collected" notification to host
 */
export async function sendVoteCompleteNotification(params: {
  to: string;
  hostName: string;
  confirmUrl: string;
  appointmentTitle: string;
}) {
  return resend.emails.send({
    from: `${appName} <${fromEmail}>`,
    to: params.to,
    subject: `全員の回答が揃いました - ${params.appointmentTitle}`,
    html: buildVoteCompleteHtml(params),
  });
}

// ─── HTML Templates ───

function buildRequestEmailHtml(p: {
  hostName: string;
  hostCompany: string;
  hostEmail: string;
  bookingUrl: string;
}) {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Helvetica Neue',sans-serif;color:#333">
      <div style="padding:32px;text-align:center;border-bottom:1px solid #e8e8e8">
        <span style="font-size:22px;font-weight:800">${appName}</span>
      </div>
      <div style="padding:28px 32px;font-size:14px;line-height:1.9">
        <p>平素は格別のご高配を賜り、厚く御礼申し上げます。<br/>本メールは、受付システム「${appName}」よりお送りしております。</p>
        <p>下記の方より、アポイントメント調整依頼が届いております。</p>
        <div style="margin-bottom:28px">
          <div>${p.hostCompany}</div>
          <div>${p.hostName}</div>
          <div>${p.hostEmail}</div>
        </div>
        <div style="text-align:center;margin-bottom:28px">
          <a href="${p.bookingUrl}" style="display:inline-block;padding:14px 48px;background:#00bfa5;color:#fff;text-decoration:none;border-radius:30px;font-size:15px;font-weight:700">日時候補から日程調整する</a>
        </div>
        <div style="border-top:1px solid #e8e8e8;padding-top:20px;font-size:12px;color:#555">
          <p>◆上記ボタンがクリックできない場合は、下記のURLよりご登録ください。</p>
          <p style="color:#00bfa5;word-break:break-all">${p.bookingUrl}</p>
          <p>※日時候補は随時予定が入る可能性があるため、早めのご回答をお願い致します。</p>
          <p>※日時候補が表示されない場合は、再度日程調整を依頼してください。</p>
        </div>
      </div>
    </div>
  `;
}

function buildConfirmEmailHtml(p: {
  hostName: string;
  hostCompany: string;
  hostEmail: string;
  visitors: { name: string; company: string; email: string }[];
  date: string;
  time: string;
  meetUrl: string;
}) {
  const visitorsHtml = p.visitors
    .map(
      (v, i) => `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:#999;margin-bottom:4px">来訪者様${p.visitors.length > 1 ? ` (${i + 1}/${p.visitors.length})` : ""}</div>
        <div style="font-size:14px;line-height:1.7">${v.company}<br/>${v.name} 様<br/>${v.email}</div>
      </div>`
    )
    .join("");

  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Helvetica Neue',sans-serif;color:#333">
      <div style="padding:32px;text-align:center;border-bottom:1px solid #e8e8e8">
        <span style="font-size:22px;font-weight:800">${appName}</span>
      </div>
      <div style="padding:28px 32px;font-size:14px;line-height:1.9">
        <p>平素は格別のご高配を賜り、厚く御礼申し上げます。<br/>本メールは、受付システム「${appName}」よりお送りしております。</p>
        <p style="font-size:16px;font-weight:700;color:#00bfa5">アポイントメントが確定しましたのでお知らせいたします。</p>
        <div style="background:#f9fafb;border:1px solid #e8e8e8;border-radius:6px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:16px">
            <div style="font-size:12px;color:#999;margin-bottom:4px">確定日時</div>
            <div style="font-size:16px;font-weight:700;color:#00bfa5">${p.date}</div>
            <div style="font-size:15px;font-weight:600;color:#00bfa5">${p.time}</div>
          </div>
          <div style="margin-bottom:16px">
            <div style="font-size:12px;color:#999;margin-bottom:4px">主催者</div>
            <div style="font-size:14px;line-height:1.7">${p.hostCompany}<br/>${p.hostName}<br/>${p.hostEmail}</div>
          </div>
          ${visitorsHtml}
          <div>
            <div style="font-size:12px;color:#999;margin-bottom:4px">会議方法</div>
            <div style="font-size:14px">Google Meet</div>
            <div style="font-size:12px;color:#00bfa5;margin-top:4px">${p.meetUrl}</div>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${p.meetUrl}" style="display:inline-block;padding:14px 48px;background:#00bfa5;color:#fff;text-decoration:none;border-radius:30px;font-size:15px;font-weight:700">Google Meetに参加する</a>
        </div>
        <div style="border-top:1px solid #e8e8e8;padding-top:20px;font-size:12px;color:#555">
          <p>※ご都合が悪くなった場合は、主催者へ直接ご連絡ください。</p>
          <p>※本メールは自動送信されています。このメールへの返信はできません。</p>
        </div>
      </div>
    </div>
  `;
}

function buildVoteCompleteHtml(p: {
  hostName: string;
  confirmUrl: string;
  appointmentTitle: string;
}) {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Helvetica Neue',sans-serif;color:#333">
      <div style="padding:32px;text-align:center;border-bottom:1px solid #e8e8e8">
        <span style="font-size:22px;font-weight:800">${appName}</span>
      </div>
      <div style="padding:28px 32px;font-size:14px;line-height:1.9">
        <p style="font-size:16px;font-weight:700;color:#00bfa5">全員の回答が揃いました</p>
        <p>「${p.appointmentTitle || "アポイントメント"}」の日程調整について、全員の回答が揃いました。下記から日程を確定してください。</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${p.confirmUrl}" style="display:inline-block;padding:14px 48px;background:#00bfa5;color:#fff;text-decoration:none;border-radius:30px;font-size:15px;font-weight:700">日程を確定する</a>
        </div>
      </div>
    </div>
  `;
}
