import EditMissionClient from '@/components/missions/EditMissionClient'

export default async function EditMissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return <EditMissionClient params={resolvedParams} searchParams={resolvedSearchParams} />
}