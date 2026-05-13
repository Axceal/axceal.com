export function AeroIcon({ className, alt, priority }: { className?: string; alt?: string; priority?: boolean }) {
  return (
    <img
      src="/assets/aero svg.svg"
      alt={alt ?? "Aero x1"}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
