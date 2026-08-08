import { catalogByGroup, autocompleteSchema } from '@/lib/warehouse/catalog';
import { rowCounts } from '@/lib/warehouse/engine';

export const runtime = 'nodejs';

/** The warehouse catalog for the playground's schema panel, plus row counts. */
export async function GET() {
  return Response.json({
    groups: catalogByGroup(),
    autocomplete: autocompleteSchema(),
    rowCounts: rowCounts(),
  });
}
