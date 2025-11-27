import WidgetChatText from "@/components/WidgetChatText";

export default async function WidgetTextPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return <WidgetChatText companyId={companyId} />;
}

