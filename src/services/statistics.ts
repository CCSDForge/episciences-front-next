import { API_URL } from '@/config/api'
import { IStat, IStatResponse } from '@/types/stat'

interface StatisticsParams {
  rvcode: string
  years?: number[]
  page?: number
  itemsPerPage?: number
}

export async function fetchStatistics({ rvcode, page = 1, itemsPerPage = 7, years }: StatisticsParams): Promise<IStat[]> {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('itemsPerPage', itemsPerPage.toString())
  params.append('rvcode', encodeURIComponent(rvcode))

  // Si years est défini et non vide, on ajoute le filtre par années
  if (years && years.length > 0) {
    years.forEach(year => params.append('year[]', year.toString()))
  }
  // Si years est undefined ou vide, on ne passe pas le paramètre (toutes les années)

  const response = await fetch(`${API_URL}/statistics/?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    next: {
      revalidate: false
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch statistics: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
} 