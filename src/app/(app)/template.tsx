"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// template.tsx re-mounts on every navigation (unlike layout.tsx), giving a
// fresh enter animation per page — a subtle fade + rise, not a spectacle.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
