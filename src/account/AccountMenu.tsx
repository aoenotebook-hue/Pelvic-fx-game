import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import type { Language } from "../i18n";

export function AccountMenu({ language, pendingCount, signOut, onSignedOut,studentId,onProgress,onSync,onReset }: {
  language: Language; pendingCount: number; signOut(): Promise<void>; onSignedOut(): void;
  studentId?:string;onProgress?():void;onSync?():void;onReset?():void;
}) {
  const menu=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as globalThis.Node))menu.current.open=false;};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const th = language === "th";
  const leave = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    try { await signOut(); onSignedOut(); }
    catch { setError(th ? "ออกจากระบบไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง งานยังถูกบันทึกไว้" : "Could not sign out. Check your connection and try again. Your work is still saved."); }
    finally { running.current = false; setBusy(false); }
  };
  const action=(callback?:()=>void)=>{if(menu.current)menu.current.open=false;callback?.();};
  return <details ref={menu} className="account-menu" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary><UserRound size={18} aria-hidden="true" /><span>{th ? "บัญชี" : "Account"}</span></summary>
    <div className="account-panel">
      <strong>{th ? "บัญชีของคุณ" : "Your account"}</strong>
      {studentId&&<p>{th?"รหัสนักศึกษา":"Student ID"}: {studentId}</p>}
      {onProgress&&<button type="button" className="secondary full" onClick={()=>action(onProgress)}>{th?"ความก้าวหน้าของฉัน":"My progress"}</button>}
      {onSync&&<button type="button" className="secondary full" onClick={()=>action(onSync)}>{th?"ส่งข้อมูลตอนนี้":"Sync now"}</button>}
      {onReset&&<button type="button" className="secondary full" onClick={()=>action(onReset)}>{th?"เริ่มฝึกใหม่":"Reset progress"}</button>}
      <p>{pendingCount ? (th ? `${pendingCount} รายการรอส่ง จะยังอยู่ในอุปกรณ์นี้ กลับเข้าสู่บัญชีเดิมเพื่อส่งต่อ` : `${pendingCount} records waiting to sync stay on this device. Sign back into the same account to submit them.`) : (th ? "งานที่บันทึกไว้จะไม่ถูกลบ" : "Saved progress will not be deleted.")}</p>
      <button type="button" className="secondary full" disabled={busy} onClick={() => void leave()}><LogOut size={18} aria-hidden="true" />{busy ? (th ? "กำลังออกจากระบบ…" : "Signing out…") : (th ? "ออกจากระบบ" : "Sign out")}</button>
      <small>{th ? "ออกจากระบบเฉพาะเบราว์เซอร์นี้" : "Signs out this browser only."}</small>
      {error && <p role="alert">{error}</p>}
    </div>
  </details>;
}
