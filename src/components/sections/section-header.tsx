import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, subtitle, align = "left" }: SectionHeaderProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-5 font-serif text-4xl leading-[1.04] text-foreground sm:text-5xl lg:text-6xl">{title}</h2>
      {subtitle ? (
        <p className={cn("mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
