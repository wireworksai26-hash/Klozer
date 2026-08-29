import Link from "next/link";
import { KlozerIcon } from "@/components/icons";

export default function Logo({ variant = "dark", size = "md", href = "/", withIcon = false }) {
  // variant: "dark" (for light backgrounds: dark text + cobalt dot)
  //          "light" (for dark backgrounds like footer: white text + cobalt dot)
  
  const sizeClasses = {
    sm: "text-[18px]",
    md: "text-[23px]",
    lg: "text-[28px]",
    xl: "text-[34px]",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  const dotSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
    xl: "w-3 h-3",
  };

  const content = (
    <span className="inline-flex items-center gap-2 select-none font-extrabold tracking-[-0.05em] leading-none transition-transform hover:opacity-90">
      {withIcon && <KlozerIcon className={`${iconSizes[size] || "w-6 h-6"} rounded-lg shadow-2xs flex-shrink-0`} />}
      <span className="inline-flex items-baseline gap-1">
        <span className={variant === "light" ? "text-white" : "text-[#171417]"} style={{ fontFamily: "var(--font-body), Inter, sans-serif" }}>
          klozer
        </span>
        <span className={`${dotSizeClasses[size] || "w-2 h-2"} rounded-full bg-[#2545ff] inline-block mb-0.5 flex-shrink-0`} />
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={`no-underline inline-flex items-center ${sizeClasses[size] || "text-[23px]"}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`inline-flex items-center ${sizeClasses[size] || "text-[23px]"}`}>
      {content}
    </div>
  );
}
