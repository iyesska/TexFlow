export function AccountHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.01em] text-balance">
        {title}
      </h1>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}
