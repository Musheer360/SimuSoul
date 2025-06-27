export default function PersonaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-[calc(100dvh-4rem)]">{children}</div>;
}
