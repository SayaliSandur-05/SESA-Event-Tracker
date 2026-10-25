import React from "react";
import Image from "next/image";

interface SesaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: "light" | "dark";
  customLogoUrl?: string;
}

export function SesaLogo({
  className = "",
  size = 44,
  showText = true,
  textColor = "light",
  customLogoUrl,
}: SesaLogoProps) {
  const logoSrc = customLogoUrl || "/sesa-logo.svg";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="SESA Crest"
        width={size}
        height={size}
        className="object-contain transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
        style={{ width: size, height: size }}
      />

      {showText && (
        <span className="hidden sm:block leading-tight text-left">
          <span
            className={`block font-display text-xl tracking-[0.08em] ${
              textColor === "light" ? "text-[#fbf5eb]" : "text-[#08162a]"
            }`}
          >
            SESA
          </span>
          <span
            className={`block text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${
              textColor === "light" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Software Engineering Student Association
          </span>
        </span>
      )}
    </div>
  );
}
