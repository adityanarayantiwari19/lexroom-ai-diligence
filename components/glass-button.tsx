"use client";

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

type GlassButtonProps = Omit<ComponentProps<typeof motion.button>, "children"> & {
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
  children: ReactNode;
};

export function GlassButton({ variant = "secondary", href, children, className = "", ...props }: GlassButtonProps) {
  const classes = `light-sweep inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium backdrop-blur-xl transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 active:scale-[.98] ${
    variant === "primary"
      ? "border-violet-300/30 bg-[linear-gradient(120deg,rgba(108,92,231,.92),rgba(83,108,222,.76))] text-white shadow-[0_0_34px_rgba(108,92,231,.28)] hover:-translate-y-0.5 hover:shadow-[0_0_46px_rgba(108,92,231,.42)]"
      : variant === "ghost"
        ? "border-transparent bg-transparent text-white/75 hover:bg-white/[.06] hover:text-white"
        : "border-white/15 bg-white/[.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[.1]"
  } ${className}`;

  if (href) {
    return <motion.a whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} href={href} className={classes}>{children}</motion.a>;
  }
  return <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} className={classes} {...props}>{children}</motion.button>;
}
