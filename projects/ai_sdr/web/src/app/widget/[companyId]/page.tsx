import WidgetChat from "@/components/WidgetChat";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return <WidgetChat companyId={companyId} />;
}

