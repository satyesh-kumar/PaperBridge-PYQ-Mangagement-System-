import React from "react";
import { Link } from "react-router-dom";

/**
 * PaperBridge Official Logo Component
 * Matches the brand identity: Paper airplane in flight with golden orbit arc, speed lines, and serif wordmark.
 *
 * @param {string} variant - "full" | "horizontal" | "stacked" | "icon"
 * @param {string} size - "sm" | "md" | "lg" | "xl"
 * @param {string} className - extra container classes
 * @param {boolean} linkToHome - whether to wrap in Link to "/"
 * @param {string} subtitle - custom tagline text
 */
export function PaperAirplaneIcon({ className = "w-8 h-8", isDark = false }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PaperBridge Logo Icon"
    >
      {/* Golden Orbital Ring Arc */}
      <path
        d="M 52 14 C 78 14 98 32 101 58 C 103 76 94 93 78 102 C 65 109 50 110 38 104"
        stroke="#C89D5C"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* 3 Golden Speed / Thrust Lines */}
      <line
        x1="18"
        y1="92"
        x2="35"
        y2="82"
        stroke="#C89D5C"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="76"
        x2="28"
        y2="67"
        stroke="#C89D5C"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="26"
        y1="64"
        x2="42"
        y2="55"
        stroke="#C89D5C"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Origami Paper Airplane Wings */}
      {/* Underbody / Shadow Fold (Golden Bronze) */}
      <polygon
        points="44,60 58,82 66,66 96,28"
        fill="#C89D5C"
      />
      
      {/* Lower Wing / Keel (Deep Navy/Obsidian) */}
      <polygon
        points="44,60 66,66 96,28"
        fill="#1E293B"
      />

      {/* Upper Main Wing (Midnight Navy / Obsidian #0D1B2A) */}
      <polygon
        points="44,60 96,28 52,48"
        className="fill-[#0D1B2A] dark:fill-[#FAF8F5]"
      />

      {/* Top Fold Light Highlight */}
      <polygon
        points="52,48 96,28 68,54"
        fill="#C89D5C"
        opacity="0.9"
      />
      
      {/* Origami Center Crease / Wing Edge */}
      <polygon
        points="44,60 96,28 60,70"
        className="fill-[#0F172A] dark:fill-[#E2E8F0]"
      />

      {/* Wing Accent Stripe */}
      <polygon
        points="55,64 96,28 65,68"
        fill="#C89D5C"
      />
    </svg>
  );
}

export default function PaperBridgeLogo({
  variant = "horizontal",
  size = "md",
  className = "",
  linkToHome = true,
  subtitle = "FAST ACCESS TO PAST PAPERS",
}) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  };

  const subSizes = {
    sm: "text-[8px] tracking-widest",
    md: "text-[9px] tracking-[0.2em]",
    lg: "text-[11px] tracking-[0.22em]",
    xl: "text-[12px] tracking-[0.25em]",
  };

  const content = (
    <div
      className={`inline-flex items-center gap-3 transition-transform duration-200 group ${
        variant === "stacked" ? "flex-col text-center" : "flex-row text-left"
      } ${className}`}
    >
      {/* Icon Badge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <PaperAirplaneIcon className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5`} />
      </div>

      {/* Typography Wordmark */}
      {variant !== "icon" && (
        <div className="flex flex-col justify-center select-none">
          <div className={`font-serif font-bold leading-none tracking-tight ${titleSizes[size]}`}>
            <span className="text-[#0D1B2A] dark:text-[#FAF8F5]">Paper</span>
            <span className="text-[#C89D5C] ml-0.5">Bridge</span>
          </div>
          {subtitle && (
            <span
              className={`font-sans font-bold uppercase text-[#8C7862] dark:text-[#A8957E] mt-1 leading-none ${subSizes[size]}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link to="/" className="inline-block focus:outline-hidden" aria-label="PaperBridge Homepage">
        {content}
      </Link>
    );
  }

  return content;
}
