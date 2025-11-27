import WidgetChatUnified from "@/components/WidgetChatUnified";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return <WidgetChatUnified companyId={companyId} />;
}

