import { useEffect, useState } from "react";
import { createBackendAdapter, type LeaderboardRow } from "../sync/adapter";
import { MINIGAME_VERSION } from "./spec";
import { useLanguage } from "../i18n";
const backend = createBackendAdapter();
export function RewardPodium({
  complete,
  reward,
  contentVersion = MINIGAME_VERSION,
}: {
  complete: boolean;
  reward: number;
  contentVersion?: string;
}) {
  const { language } = useLanguage(),
    t = (en: string, th: string) => (language === "th" ? th : en);
  const [rows, setRows] = useState<LeaderboardRow[]>([]),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (complete && backend.mode === "connected")
      void backend
        .loadLeaderboard?.(contentVersion)
        .then((data) => {
          if (active) {
            setRows(data);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [complete, reward, contentVersion]);
  return (
    <article className="panel">
      <h2>{t("Cohort reward podium", "Podium reward ของ cohort")}</h2>
      <p>
        {t(
          "Equal rewards share rank. No speed tie-break; only this content/reward version is compared.",
          "Reward เท่ากันได้อันดับร่วม ไม่ใช้เวลา เปรียบเทียบเฉพาะ content/reward version เดียวกัน",
        )}
      </p>
      {!complete ? (
        <p>
          {t("Finish the shift to view the podium.", "จบเวรเพื่อดู podium")}
        </p>
      ) : backend.mode === "demo" ? (
        <p>
          {t("Local demo: your reward is ", "Demo ในเครื่อง: reward ของคุณ ")}
          {reward}
          {t(
            ". Classmates appear only after institutional connection; no invented scores.",
            " เพื่อนจะแสดงเมื่อเชื่อมบริการสถาบัน ไม่มีคะแนนที่แต่งขึ้น",
          )}
        </p>
      ) : error ? (
        <p role="alert">
          {t(
            "Ranking unavailable. Your saved learning evidence is safe; retry after sync.",
            "ยังโหลดอันดับไม่ได้ หลักฐานการเรียนยังบันทึกไว้ ลองใหม่หลัง sync",
          )}
        </p>
      ) : rows.length ? (
        <>
          <div className="podium">
            {/* Classic podium order: 2nd, 1st, 3rd. */}
            {[1, 0, 2]
              .map((index) => rows.filter((row) => row.rank <= 3)[index])
              .filter(Boolean)
              .map((row) => (
                <div className={`podium-place place-${row.rank}`} key={`${row.rank}:${row.label}`}>
                  <span className="podium-person">
                    {row.rank === 1 ? "★" : row.rank}
                  </span>
                  <strong>
                    {row.isCurrentLearner ? t("You", "คุณ") : row.label}
                  </strong>
                  <small>{row.reward} {t("reward", "รางวัล")}</small>
                  <div>{row.rank}</div>
                </div>
              ))}
          </div>
          <ol>
            {rows.map((row) => (
              <li key={`${row.rank}:${row.label}`}>
                {row.rank}. {row.isCurrentLearner ? t("You", "คุณ") : row.label}{" "}
                — {row.reward}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p>
          {t(
            "No confirmed matching attempts yet. Sync to update.",
            "ยังไม่มี attempt เวอร์ชันเดียวกันที่ยืนยันแล้ว ให้ sync",
          )}
        </p>
      )}
    </article>
  );
}
