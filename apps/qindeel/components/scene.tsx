"use client";

import { useId } from "react";
import type { Lesson } from "@platform/core/types";

function Star({
  x,
  y,
  s = 1,
  color = "#f3bf6c",
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0-12 3-3 12 0 3 3 0 12-3 3-12 0-3-3Z"
      fill={color}
    />
  );
}

function Child({
  x,
  y,
  girl = false,
  scale = 1,
  color = "#bb6e48",
}: {
  x: number;
  y: number;
  girl?: boolean;
  scale?: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-25 57-32 98-11 98 0 65 11 98 30 98 24 56Z" fill="#4e5351" />
      <path
        d="M-32 96h20v10h-30q-2-8 10-10M11 96h20q13 2 12 10H11Z"
        fill="#473448"
      />
      <path d="M-21 1Q0-11 21 1l16 52q-32 20-74 0Z" fill={color} />
      <path
        d="M-23 6-43 35l12 6 18-22M23 6l21 23-10 9-20-19"
        stroke={color}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <ellipse cx="-39" cy="39" rx="7" ry="8" fill="#dca376" />
      <ellipse cx="39" cy="33" rx="7" ry="8" fill="#dca376" />
      {girl ? (
        <>
          <path
            d="M-28-39Q-24-78 2-77q32 2 30 43L37 4Q2 23-37 4Z"
            fill="#838e70"
          />
          <ellipse cx="1" cy="-37" rx="23" ry="27" fill="#dca376" />
          <path d="M-22-52Q0-47 20-61Q-3-75-22-52" fill="#738364" />
        </>
      ) : (
        <>
          <ellipse cx="0" cy="-33" rx="26" ry="30" fill="#dca376" />
          <path
            d="M-26-32q-11-47 26-45 36-2 28 46l-9-14q-17 5-30-7l-10 22Z"
            fill="#423447"
          />
          <path d="M-21-66q-1-19 11-16-2 12 12 15" fill="#423447" />
        </>
      )}
      <ellipse cx="-9" cy="-35" rx="2" ry="3" fill="#423447" />
      <ellipse cx="10" cy="-35" rx="2" ry="3" fill="#423447" />
      <path
        d="M-5-20q6 5 12-1"
        stroke="#8e5140"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="-16" cy="-26" r="4" fill="#d38c6e" />
      <circle cx="17" cy="-26" r="4" fill="#d38c6e" />
      <path d="M0 8v42" stroke="#ffffff" strokeOpacity=".2" strokeWidth="2" />
    </g>
  );
}

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 0q-7-74 13-133M0-18q-26-39-46-46M5-60q26-36 48-44"
        stroke="#748168"
        strokeWidth="5"
        fill="none"
      />
      <ellipse
        cx="-27"
        cy="-51"
        rx="12"
        ry="30"
        transform="rotate(-44 -27 -51)"
        fill="#97a082"
      />
      <ellipse
        cx="32"
        cy="-88"
        rx="12"
        ry="29"
        transform="rotate(48 32 -88)"
        fill="#748168"
      />
      <ellipse
        cx="11"
        cy="-123"
        rx="11"
        ry="25"
        transform="rotate(14 11 -123)"
        fill="#889473"
      />
      <path d="M-29-7H30L22 34H-20Z" fill="#d19a75" />
      <path d="M-33-12h67v12h-67Z" fill="#bc8261" />
    </g>
  );
}

export function HeroIllustration() {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 640 580"
      role="img"
      aria-label="طفلان يكتشفان عالماً من المعرفة فوق كتاب مفتوح، بين النباتات والنجوم"
    >
      <defs>
        <linearGradient id={`${uid}page`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff9e9" />
          <stop offset="1" stopColor="#e5cbae" />
        </linearGradient>
        <pattern
          id={`${uid}paper`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".5" fill="#91704d" opacity=".1" />
        </pattern>
      </defs>
      <path
        d="M125 455Q30 315 133 165q81-122 216-115 210 1 210 235 28 178-116 221Z"
        fill="#eae4d5"
      />
      <circle cx="422" cy="147" r="57" fill="#f2c66e" />
      <path d="M433 92a57 57 0 0 0 38 98 57 57 0 0 1-38-98" fill="#fbf5e9" />
      <path
        d="M99 440q96-44 218 35 98-69 217-45l-19 68q-98-11-198 35-119-62-205-37Z"
        fill="#584260"
      />
      <path
        d="M106 424q103-23 211 38 107-71 217-51l-13 75q-110-3-205 36-95-54-207-42Z"
        fill="#ece0ca"
      />
      <path
        d="M103 411q98-22 214 38 114-70 220-55l-7 78q-116-1-213 39-97-55-211-43Z"
        fill={`url(#${uid}page)`}
      />
      <path
        d="M317 449v62M110 475q113-1 201 42M324 516q92-35 191-37"
        stroke="#b9a17e"
        strokeWidth="2"
        fill="none"
      />
      <path d="M112 408q103-22 201 33l-10 37q-96-44-186-40Z" fill="#fff8e7" />
      <path
        d="M147 422q64 0 121 25M151 434q57 0 102 18M361 445q66-28 127-29M361 456q60-21 106-22"
        stroke="#c9b898"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Plant x={485} y={387} scale={1.05} />
      <Plant x={151} y={394} scale={0.68} />
      <path d="M213 412v-54q0-30 32-31h81q33 0 33 31v54" fill="#c2ac81" />
      <path d="M215 411h145" stroke="#957c62" strokeWidth="7" />
      <Child x={244} y={306} scale={0.94} color="#ce875c" />
      <Child x={358} y={313} girl scale={0.88} color="#a699b8" />
      <path
        d="M262 315q27-5 40 9 23-22 45-19l-5 32q-23 1-39 13-17-12-35-11Z"
        fill="#fff8e5"
      />
      <path d="m303 324 0 26" stroke="#c7b798" strokeWidth="2" />
      <g transform="translate(122 204) rotate(-13)">
        <path d="M-21-26h42l7 45q-28 21-56 0Z" fill="#d5a159" />
        <path d="M-12-17h24v33h-24Z" fill="#fff0b4" />
        <path
          d="M-23-29h47M-17-39h34M0-41v-14"
          stroke="#745e54"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M-11-43q-1-17 11-17t11 17"
          fill="none"
          stroke="#745e54"
          strokeWidth="3"
        />
      </g>
      <Star x={296} y={117} s={1.25} />
      <Star x={199} y={174} s={0.6} color="#aa94ad" />
      <Star x={523} y={242} s={0.75} />
      <Star x={414} y={242} s={0.55} color="#aa94ad" />
      <Star x={79} y={314} s={0.65} />
      <Star x={357} y={172} s={0.5} color="#8d9b7c" />
      <path
        d="m182 118 3 13m-10-7 16 1M503 128v15m-7-7h14M569 366v14m-7-7h14"
        stroke="#96899a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M184 274q-28-28-41 0 13-12 22 5M464 294q19-24 35-7-13-5-18 12"
        stroke="#978c72"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="336" cy="217" r="3" fill="#ad9b79" />
      <circle cx="210" cy="227" r="3" fill="#ad9b79" />
      <circle cx="483" cy="198" r="3" fill="#ad9b79" />
      <path
        d="M101 531q238 41 444-15"
        stroke="#dcd2be"
        strokeWidth="2"
        fill="none"
      />
      <rect
        width="640"
        height="580"
        fill={`url(#${uid}paper)`}
        pointerEvents="none"
      />
    </svg>
  );
}

/** The drawn child alone, for the cover when no generated picture is available. */
export function ChildFigure({
  gender,
  label,
}: {
  gender: "boy" | "girl";
  label: string;
}) {
  return (
    <svg className="child-figure" viewBox="-50 -84 100 194" role="img" aria-label={label}>
      <Child
        x={0}
        y={0}
        girl={gender === "girl"}
        color={gender === "girl" ? "#a094b4" : "#c28c65"}
      />
    </svg>
  );
}

export function Scene({
  scene,
  avatar = "boy",
  compact = false,
  hideChild = false,
}: {
  scene: Lesson["scene"];
  avatar?: "boy" | "girl";
  compact?: boolean;
  /** Composite path: the approved background only; the child is laid over it. */
  hideChild?: boolean;
}) {
  const dark = scene === "sleep";
  const labels = {
    sleep: "طفل يستعد للنوم في غرفة هادئة",
    morning: "طفل يستقبل الصباح عند النافذة",
    food: "طفل إلى جوار مائدة الطعام",
    travel: "طفل يستعد للسفر مع حقيبته",
    home: "طفل عند باب المنزل",
    mosque: "طفل يتعلم آداب زيارة المسجد",
    pilgrimage: "طفل يتعلم عن رحلة الحج من كتاب مصور",
  };
  return (
    <svg
      className={`scene ${compact ? "scene-compact" : ""}`}
      viewBox="0 0 480 350"
      role="img"
      aria-label={labels[scene]}
    >
      <rect
        width="480"
        height="350"
        rx="24"
        fill={
          dark
            ? "#55506b"
            : scene === "food"
              ? "#efe1c9"
              : scene === "pilgrimage"
                ? "#e7ddd0"
                : "#e1e5d7"
        }
      />
      <path d="M0 280q230-35 480 0v70H0Z" fill={dark ? "#777083" : "#d1d4be"} />
      {(scene === "sleep" || scene === "morning") && (
        <>
          <path
            d="M281 203V78q0-43 47-43t47 43v125Z"
            fill={dark ? "#30394d" : "#c0d8d7"}
            stroke={dark ? "#aa91a4" : "#af9b7d"}
            strokeWidth="10"
          />
          {dark ? (
            <>
              <path
                d="M327 65a26 26 0 1 0 23 37 28 28 0 0 1-23-37"
                fill="#f1d89b"
              />
              <Star x={353} y={130} s={0.4} />
              <Star x={310} y={158} s={0.25} />
            </>
          ) : (
            <>
              <circle cx="328" cy="87" r="25" fill="#ecc37a" />
              <path d="M285 170q29-32 45 0 28-38 44-6v39h-90Z" fill="#8eaf96" />
            </>
          )}
          <path
            d="M328 41v162M282 126h91"
            stroke={dark ? "#aa91a4" : "#af9b7d"}
            strokeWidth="5"
          />
        </>
      )}
      {scene === "sleep" && (
        <>
          <rect x="49" y="245" width="223" height="59" rx="15" fill="#cbb6ad" />
          <rect x="58" y="230" width="202" height="48" rx="16" fill="#a7a1bb" />
          <path d="M93 239h52q24 0 24 34H69q0-34 24-34" fill="#e7d9c8" />
          <rect x="50" y="284" width="12" height="40" rx="5" fill="#a08578" />
          <rect x="257" y="284" width="12" height="40" rx="5" fill="#a08578" />
        </>
      )}
      {scene === "food" && (
        <>
          <rect x="242" y="214" width="165" height="17" rx="8" fill="#ad856a" />
          <path d="M262 230v80M387 230v80" stroke="#ad856a" strokeWidth="12" />
          <ellipse cx="315" cy="211" rx="47" ry="10" fill="#faf3db" />
          <path d="M288 208q9-27 26-21 29-3 30 21Z" fill="#d69a52" />
          <rect x="369" y="184" width="20" height="28" rx="4" fill="#a2c0bd" />
          <circle cx="307" cy="199" r="3" fill="#b0773e" />
          <circle cx="325" cy="203" r="3" fill="#b0773e" />
        </>
      )}
      {scene === "travel" && (
        <>
          <path
            d="M279 151q28-32 72-3 26-4 29 14H265q-2-9 14-11M61 78q22-30 55-4 25-1 28 12H46q-2-10 15-8"
            fill="#f7f4e9"
          />
          <rect x="287" y="205" width="68" height="80" rx="14" fill="#c89662" />
          <path
            d="M306 206v-22h30v22M300 212v64M342 212v64"
            stroke="#95714f"
            strokeWidth="4"
            fill="none"
          />
          <circle cx="300" cy="289" r="6" fill="#584955" />
          <circle cx="344" cy="289" r="6" fill="#584955" />
          <path
            d="M80 321h328"
            stroke="#f7f4e9"
            strokeWidth="4"
            strokeDasharray="19 18"
          />
        </>
      )}
      {scene === "home" && (
        <>
          <path d="M254 280V115q0-51 65-51t65 51v165Z" fill="#c79879" />
          <path d="M270 280V118q0-37 49-37t49 37v162Z" fill="#ad7e63" />
          <circle cx="345" cy="198" r="6" fill="#eec78a" />
          <path d="M255 282h131" stroke="#937b68" strokeWidth="7" />
        </>
      )}
      {scene === "mosque" && (
        <>
          <rect
            x="261"
            y="71"
            width="104"
            height="143"
            rx="49"
            fill="#c0ccb6"
          />
          <path d="M290 212v-81q22-30 47 0v81" fill="#f0ebd9" />
          <path d="M262 216h103M254 235h121" stroke="#97ac8c" strokeWidth="7" />
          <path d="m247 296 74-52 80 52-74 33Z" fill="#a9a0b4" />
          <path
            d="m266 294 54-35 59 35-51 21Z"
            fill="none"
            stroke="#e9dfc6"
            strokeWidth="3"
          />
        </>
      )}
      {scene === "pilgrimage" && (
        <>
          <path
            d="M270 187q35-17 63 5 35-22 64-6l-5 83q-29-10-59 10-30-18-61-10Z"
            fill="#faf0d8"
          />
          <path d="M333 192v87" stroke="#beaa84" strokeWidth="3" />
          <path
            d="m284 251 10-11 10 11 11-15M348 252l10-15 11 11 12-7"
            stroke="#b8b298"
            strokeWidth="3"
            fill="none"
          />
          <path d="M266 270h133" stroke="#a17d63" strokeWidth="8" />
        </>
      )}
      {!hideChild && <Child
        x={scene === "sleep" ? 189 : 164}
        y={scene === "sleep" ? 206 : 184}
        scale={scene === "sleep" ? 0.73 : 0.95}
        girl={avatar === "girl"}
        color={avatar === "girl" ? "#a094b4" : "#c28c65"}
      />}
      <Plant x={421} y={272} scale={0.44} />
      <Star x={93} y={138} s={0.7} color={dark ? "#dcc393" : "#bc9d65"} />
      <Star x={224} y={69} s={0.5} color={dark ? "#ddc798" : "#ad9fb4"} />
    </svg>
  );
}
