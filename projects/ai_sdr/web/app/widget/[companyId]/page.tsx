import WidgetChatRealtime from "@/components/WidgetChatRealtime";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return <WidgetChatRealtime companyId={companyId} />;
}

