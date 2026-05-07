"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type MotionRevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

export function MotionReveal({ children, className, delay = 0, ...props }: MotionRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-96px" }}
      transition={{ duration: 0.82, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
