import { Volume } from '@/utils/volume'

export async function fetchVolumes(rvcode: string, language: string): Promise<{ data: Volume[], totalItems: number }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/volumes?page=1&itemsPerPage=1&rvcode=${rvcode}`)
  const data = await response.json()

  return {
    data: data['hydra:member'].map((volume: any) => ({
      id: volume['vid'],
      title: volume['titles'][language] || volume['titles']['en'],
      type: volume['vol_type'],
      year: volume['vol_year'],
      number: volume['vol_num'],
      description: volume['descriptions'][language] || volume['descriptions']['en'],
      published: true,
      createdAt: volume['date_creation'],
      updatedAt: volume['date_updated']
    })),
    totalItems: data['hydra:totalItems']
  }
} 