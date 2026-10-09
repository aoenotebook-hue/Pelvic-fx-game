import { useEffect, useState } from "react";
import type { BackendAdapter } from "../sync/adapter";
import { useLanguage } from "../i18n";

/**
 * Teachers must pass two-step verification (an authenticator-app code) before any learner data is shown.
 * First visit: scan a QR code once. Later visits: type the 6-digit code from the app.
 */
export function MfaSetup({ backend, onVerified }: { backend: BackendAdapter; onVerified(): void }) {
  const { language } = useLanguage();
  const tr = (en: string, th: string) => (language === "th" ? th : en);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<{ qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void backend.mfaStatus?.().then((current) => {
      if (!active) return;
      if (current.verified) onVerified();
      else setFactorId(current.factorId);
    }).catch(() => active && setStatus(tr("Could not check two-step verification. Try again.", "ตรวจสถานะการยืนยันสองขั้นตอนไม่ได้ ลองใหม่")));
    return () => { active = false; };
  }, []);

  const startEnrolment = async () => {
    setBusy(true);
    try {
      const result = await backend.mfaEnroll!();
      setFactorId(result.factorId);
      setEnrolment({ qrCode: result.qrCode, secret: result.secret });
    } catch {
      setStatus(tr("Could not start set-up. Ask the course administrator to enable authenticator apps (TOTP) in Supabase Auth.", "เริ่มตั้งค่าไม่ได้ ให้ผู้ดูแลเปิดใช้ authenticator app (TOTP) ใน Supabase Auth"));
    } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!factorId || !/^\d{6}$/.test(code.trim())) { setStatus(tr("Enter the 6-digit code from your authenticator app.", "ใส่รหัส 6 หลักจากแอป authenticator")); return; }
    setBusy(true);
    try {
      await backend.mfaVerify!(factorId, code.trim());
      setCode("");
      onVerified();
    } catch {
      setStatus(tr("That code did not work. Check the time on your phone and try the newest code.", "รหัสไม่ถูกต้อง ตรวจเวลาในโทรศัพท์แล้วใช้รหัสล่าสุด"));
    } finally { setBusy(false); }
  };

  return (
    <section className="reading page-enter mfa-setup">
      <span className="eyebrow">{tr("TEACHER SECURITY", "ความปลอดภัยของอาจารย์")}</span>
      <h1>{tr("Two-step verification", "การยืนยันตัวตนสองขั้นตอน")}</h1>
      <p>{tr(
        "Student answers and names are protected. Teachers confirm their identity with a code from an authenticator app (Google Authenticator, Microsoft Authenticator or similar) in addition to the email link.",
        "คำตอบและข้อมูลนักศึกษาได้รับการคุ้มครอง อาจารย์ต้องยืนยันตัวตนด้วยรหัสจากแอป authenticator (Google Authenticator, Microsoft Authenticator หรือแอปอื่น) เพิ่มจากลิงก์อีเมล",
      )}</p>
      {!factorId && !enrolment && (
        <button className="primary" disabled={busy} onClick={() => void startEnrolment()}>
          {tr("Set up my authenticator app", "ตั้งค่าแอป authenticator")}
        </button>
      )}
      {enrolment && (
        <div className="panel">
          <p>{tr("1. Open your authenticator app and scan this QR code.", "1. เปิดแอป authenticator แล้วสแกน QR code นี้")}</p>
          <img className="mfa-qr" src={enrolment.qrCode} alt={tr("QR code for your authenticator app", "QR code สำหรับแอป authenticator")} width={200} height={200} />
          <details>
            <summary>{tr("Can't scan? Type this key instead", "สแกนไม่ได้? พิมพ์รหัสนี้แทน")}</summary>
            <code className="mfa-secret">{enrolment.secret}</code>
          </details>
          <p>{tr("2. Type the 6-digit code it shows.", "2. พิมพ์รหัส 6 หลักที่แอปแสดง")}</p>
        </div>
      )}
      {factorId && (
        <div className="mfa-verify">
          <label>
            <span>{tr("6-digit code", "รหัส 6 หลัก")}</span>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
          </label>
          <button className="primary" disabled={busy || code.length !== 6} onClick={() => void verify()}>
            {tr("Verify", "ยืนยัน")}
          </button>
        </div>
      )}
      <p role="status">{status}</p>
      <small>{tr("Lost your phone? Ask the course administrator to reset your second step; never share codes.", "โทรศัพท์หาย? ให้ผู้ดูแลรายวิชารีเซ็ต อย่าบอกรหัสกับผู้อื่น")}</small>
    </section>
  );
}
