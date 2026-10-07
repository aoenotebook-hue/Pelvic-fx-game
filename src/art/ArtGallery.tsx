import { useState } from "react";
import { ClinicalArt } from "./ClinicalArt";
const kinds = [
  "pelvis",
  "ligament",
  "force-apc",
  "force-lc",
  "force-vs",
  "body",
  "binder",
  "blood",
  "beam-inlet",
  "beam-outlet",
  "ct",
  "iv",
  "lab",
  "fluid",
  "antibiotic",
  "foley",
  "tetanus",
  "packing",
  "team",
  "organ",
  "wound",
];
export function ArtGallery() {
  const [thai, setThai] = useState(false);
  return (
    <main className="main">
      <h1>{thai ? "ทบทวนภาพ SVG ฉบับร่าง" : "Draft SVG art review"}</h1>
      <button className="secondary" onClick={() => setThai((value) => !value)}>
        TH / EN
      </button>
      <p>
        {thai
          ? "แผนภาพเพื่อเรียน ไม่ใช่ภาพวินิจฉัยหรือการรับรองทักษะ"
          : "Teaching schematics, not diagnostic images or procedural certification."}
      </p>
      <div className="mission-grid">
        {kinds.map((kind) => (
          <figure className="panel" key={kind}>
            <ClinicalArt
              kind={kind}
              ariaLabel={`${thai ? "แผนภาพ" : "Schematic"}: ${kind}`}
            />
            <figcaption>{kind}</figcaption>
          </figure>
        ))}
      </div>
      <a href="/">{thai ? "กลับเกม" : "Return to game"}</a>
    </main>
  );
}
