import { useId } from "react";
export interface ArtProps {
  kind?: string;
  highlight?: string;
  state?: string;
  ariaLabel: string;
  size?: number;
  amount?: number;
}
/** Educational schematics only: never diagnostic radiographs or procedural certification. */
export function ClinicalArt({
  kind = "pelvis",
  highlight,
  state,
  ariaLabel,
  size = 240,
  amount,
}: ArtProps) {
  const title = useId();
  const color = highlight ? "#FF8A3D" : "#F6E7C8";
  const liquidY = 168 - 110 * Math.max(0, Math.min(1, amount ?? 0.64));
  return (
    <svg
      viewBox="0 0 240 200"
      width={size}
      role="img"
      aria-labelledby={title}
      className={`clinical-art art-${kind}`}
    >
      <title id={title}>{ariaLabel}</title>
      <rect x="5" y="5" width="230" height="190" rx="28" fill="#edf6f5" />
      {/pelvis|ligament|force/.test(kind) ? (
        <g fill={color} stroke="#26323F" strokeWidth="3" strokeLinejoin="round">
          <path
            id={`${title}-ilium-left`}
            d="M100 52 Q42 10 31 71 Q25 103 71 122 L101 96Z"
          />
          <path
            id={`${title}-ilium-right`}
            d="M140 52 Q198 10 209 71 Q215 103 169 122 L139 96Z"
          />
          <path
            id={`${title}-sacrum`}
            d="M101 53 L139 53 L131 103 L109 103Z"
            fill="#9DB8D9"
          />
          <path
            id={`${title}-ischium-left`}
            d="M70 120 Q58 155 83 173 L113 144 L100 130 L80 146Z"
          />
          <path
            id={`${title}-ischium-right`}
            d="M170 120 Q182 155 157 173 L127 144 L140 130 L160 146Z"
          />
          <path
            id={`${title}-pubis`}
            d="M83 173 L113 144 L127 144 L157 173 L127 158 L113 158Z"
          />
          <path
            id={`${title}-symphysis`}
            d="M120 146 L120 159"
            stroke="#E8616D"
            strokeWidth="7"
          />
          <path
            id={`${title}-si-joints`}
            d="M99 55L100 91M141 55L140 91"
            stroke="#5B7FD6"
            strokeWidth="5"
          />
          {kind.includes("ligament") && (
            <path
              d="M89 61L150 72M90 105L160 144M150 105L80 144"
              fill="none"
              stroke="#9DB8D9"
              strokeWidth="8"
            />
          )}
          {kind.includes("force") && (
            <path
              d={
                kind.includes("vs")
                  ? "M190 183V102L181 114M190 102L199 114"
                  : kind.includes("lc")
                    ? "M12 98H59L47 87M59 98L47 109"
                    : "M101 30L74 14M139 30L166 14"
              }
              fill="none"
              stroke="#E8616D"
              strokeWidth="7"
            />
          )}
        </g>
      ) : kind.includes("body") || kind.includes("binder") ? (
        <g stroke="#26323F" strokeWidth="3">
          <rect x="35" y="14" width="170" height="173" rx="25" fill="#dce6ef" />
          <circle cx="120" cy="36" r="17" fill="#F6E7C8" />
          <path d="M98 60Q120 51 142 60L150 111H90Z" fill="#9DB8D9" />
          <path
            d="M98 110L101 170M142 110L139 170"
            stroke="#9DB8D9"
            strokeWidth="20"
          />
          <path
            d="M96 65L74 104M144 65L166 104"
            stroke="#F6E7C8"
            strokeWidth="13"
          />
          {kind.includes("binder") && (
            <rect x="84" y="102" width="72" height="17" rx="7" fill="#FF8A3D" />
          )}
          <path d="M113 38Q120 44 127 38" fill="none" />
        </g>
      ) : kind.includes("blood") || kind.includes("gauge") ? (
        <g stroke="#26323F" strokeWidth="3">
          <path d="M60 38H180L163 168H77Z" fill="#fff" />
          <path
            d={`M${60 + ((liquidY - 38) * 17) / 130} ${liquidY}H${180 - ((liquidY - 38) * 17) / 130}L163 168H77Z`}
            fill="#E8616D"
          />
          <path d="M60 38Q120 3 180 38" fill="none" />
          {[60, 90, 120, 150].map((y, i) => (
            <g key={y}>
              <path d={`M83 ${y}H96`} />
              <text x="103" y={y + 5} fontSize="14">
                {["I", "II", "III", "IV"][i]}
              </text>
            </g>
          ))}
        </g>
      ) : kind.includes("beam") ? (
        <g stroke="#26323F" strokeWidth="3">
          <rect x="38" y="112" width="160" height="22" rx="8" fill="#9DB8D9" />
          <ellipse cx="120" cy="99" rx="44" ry="12" fill="#F6E7C8" />
          <path
            d={
              kind.includes("outlet")
                ? "M175 25L113 99L110 77M113 99L135 92"
                : "M57 25L120 99L98 92M120 99L123 77"
            }
            stroke="#E8616D"
            strokeWidth="7"
            fill="none"
          />
        </g>
      ) : kind === "ct" ? (
        <g stroke="#26323F" strokeWidth="3">
          <rect x="58" y="31" width="125" height="141" rx="36" fill="#9DB8D9" />
          <circle cx="120" cy="89" r="40" fill="#fff" />
          <circle cx="120" cy="89" r="25" fill="#edf6f5" />
          <path d="M23 142H177V158H23Z" fill="#F6E7C8" />
          <path d="M41 158V181M155 158V181" />
          <circle cx="160" cy="53" r="5" fill="#3BB273" />
        </g>
      ) : kind === "iv" ? (
        <g stroke="#26323F" strokeWidth="3">
          <path d="M43 141L175 55" stroke="#9DB8D9" strokeWidth="15" />
          <path d="M175 55L198 40" />
          <path
            d="M104 87L87 53L58 73L80 109M118 96L148 126L170 102L136 82"
            fill="#bde4d0"
          />
          <rect x="32" y="132" width="32" height="22" rx="6" fill="#fff" />
        </g>
      ) : kind === "lab" ? (
        <g stroke="#26323F" strokeWidth="3">
          {[72, 120, 168].map((x, index) => (
            <g key={x}>
              <path
                d={`M${x - 15} 54V145Q${x} 174 ${x + 15} 145V54Z`}
                fill="#fff"
              />
              <path
                d={`M${x - 13} 108H${x + 13}V144Q${x} 166 ${x - 13} 144Z`}
                fill={["#E8616D", "#F5C84C", "#9DB8D9"][index]}
              />
              <rect
                x={x - 18}
                y="44"
                width="36"
                height="15"
                rx="5"
                fill="#5B7FD6"
              />
            </g>
          ))}
        </g>
      ) : kind === "fluid" || kind === "antibiotic" ? (
        <g stroke="#26323F" strokeWidth="3">
          <rect
            x="78"
            y="46"
            width="84"
            height="99"
            rx={kind === "fluid" ? 18 : 8}
            fill="#fff"
          />
          <rect x="93" y="28" width="54" height="19" rx="6" fill="#9DB8D9" />
          <path
            d="M88 102H152V136H88Z"
            fill={kind === "fluid" ? "#9DB8D9" : "#bde4d0"}
          />
          {kind === "fluid" ? (
            <path d="M120 145V175Q142 184 151 164" fill="none" />
          ) : (
            <path d="M105 77H135M120 62V92" stroke="#3BB273" strokeWidth="7" />
          )}
        </g>
      ) : kind === "foley" ? (
        <g stroke="#26323F" strokeWidth="3">
          <path
            d="M84 34V95Q84 143 138 137Q173 131 160 82"
            fill="none"
            stroke="#F5C84C"
            strokeWidth="12"
          />
          <ellipse cx="160" cy="74" rx="16" ry="24" fill="#F6E7C8" />
          <circle
            cx="120"
            cy="103"
            r="69"
            fill="none"
            stroke="#E8616D"
            strokeWidth="8"
          />
          <path d="M70 54L168 155" stroke="#E8616D" strokeWidth="9" />
        </g>
      ) : kind === "tetanus" || kind === "syringe" ? (
        <g stroke="#26323F" strokeWidth="3">
          <path d="M66 139L164 41M152 29L176 53M46 126L79 158" />
          <path d="M67 116L125 57L147 80L88 139Z" fill="#bde4d0" />
          <path d="M96 104L111 120M111 89L126 105" />
        </g>
      ) : kind === "packing" ? (
        <g stroke="#26323F" strokeWidth="3">
          <path d="M49 74L151 47L193 112L84 149Z" fill="#fff" />
          <path
            d="M52 87L86 139M67 78L100 135M84 73L119 130M106 66L136 121M55 110L169 79M66 126L182 98"
            stroke="#9DB8D9"
          />
        </g>
      ) : kind.includes("team") || kind.includes("phone") ? (
        <g stroke="#26323F" strokeWidth="3">
          {[58, 120, 182].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy="67" r="23" fill="#F6E7C8" />
              <rect
                x={x - 27}
                y="94"
                width="54"
                height="56"
                rx="15"
                fill={["#9DB8D9", "#bde4d0", "#ffe1b6"][i]}
              />
              <path d={`M${x - 10} 67Q${x} 76 ${x + 10} 67`} fill="none" />
            </g>
          ))}
        </g>
      ) : kind.includes("wound") || kind.includes("organ") ? (
        <g stroke="#26323F" strokeWidth="3">
          <path
            d="M60 85Q48 35 106 55Q130 30 169 69Q197 140 129 155Q69 155 60 85Z"
            fill="#e7b9c0"
          />
          <circle cx="98" cy="88" r="4" />
          <circle cx="144" cy="88" r="4" />
          <path d="M102 120Q120 108 139 120" fill="none" />
          {kind.includes("wound") && (
            <ellipse cx="162" cy="137" rx="25" ry="14" fill="#F5C84C" />
          )}
        </g>
      ) : (
        <g stroke="#26323F" strokeWidth="3">
          <rect x="76" y="36" width="88" height="117" rx="17" fill="#fff" />
          <rect x="86" y="30" width="68" height="17" rx="5" fill="#9DB8D9" />
          <path d="M93 88H147M120 61V115" stroke="#E8616D" strokeWidth="10" />
          <circle cx="111" cy="136" r="3" />
          <circle cx="129" cy="136" r="3" />
        </g>
      )}
      {state === "reward" && (
        <text x="184" y="37" fontSize="25" fill="#F5C84C">
          ★
        </text>
      )}
    </svg>
  );
}
export const PelvisFront = (p: Omit<ArtProps, "kind">) => (
  <ClinicalArt {...p} kind="pelvis" />
);
export const BodySupine = (p: Omit<ArtProps, "kind">) => (
  <ClinicalArt {...p} kind="body" />
);
export const PelvisLigaments = (p: Omit<ArtProps, "kind">) => (
  <ClinicalArt {...p} kind="ligament" />
);
