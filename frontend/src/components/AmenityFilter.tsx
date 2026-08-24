import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import {
  listAmenities,
  type Amenity,
} from "../api/amenities";

/**
 * Ausstattungsfilter: Checkbox-Gruppe über dem festen Merkmals-Katalog
 * (Beschluss 21.8.2026 – nur lesend, siehe backend/src/routes/amenities.ts).
 * Kontrollierter State – die Auswahl liegt bei der aufrufenden Ansicht;
 * diese filtert clientseitig mit AND-Logik.
 *
 * Referenz-Nutzung ist die Raumliste (pages/RoomList.tsx). Die Freie-Räume-
 * Suche (pages/RoomSearch.tsx) bindet dieselbe Komponente innerhalb ihrer
 * Filter-Card ein (Konzept „Freie-Räume-Suche → Merkmale": dieselbe Gruppe
 * mit AND-Logik statt einer Kopie); deshalb lebt der Baustein in components/.
 * Lade- und Fehlerzustand des Katalogs bleiben bewusst inline innerhalb
 * dieser Card – eine sekundäre Ladequelle blockiert nicht die ganze Ansicht
 * (Konzept „Fehleranzeige").
 */

interface AmenityFilterProps {
  /** Gewählte Merkmals-Schlüssel (kontrolliert von der Ansicht). */
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
}

export function AmenityFilter({ selectedKeys, onSelectionChange }: AmenityFilterProps) {
  const [catalog, setCatalog] = useState<Amenity[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const loadCatalog = useCallback(
    async () => {
      setError(false);
      try {
        setCatalog(await listAmenities());
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // Unmount/Neuladen
        setError(true);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, reloadTick]);

  const toggleAmenity = (key: string, checked: boolean | "indeterminate") => {
    if (!checked) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else if (!selectedKeys.includes(key)) {
      // Dublettenfrei: Auswahl bleibt eine Menge von Schlüsseln.
      onSelectionChange([...selectedKeys, key]);
    }
  };

  return (
    <Card data-testid="amenity-filter" className="mb-6">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* Typo-Stufe laut Design-Skala kommt unverändert aus ui/card */}
            <CardTitle>Nach Ausstattung filtern</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Zeigt Räume, die alle gewählten Merkmale besitzen.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
            disabled={selectedKeys.length === 0}
            data-testid="amenity-filter-reset"
          >
            Filter zurücksetzen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Ladezustand in der Form des Zielinhalts (Design-Konzept). */}
        {catalog === null && !error && (
          <div data-testid="amenity-filter-loading" aria-busy="true" className="flex flex-wrap gap-x-6 gap-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-20" />
              </span>
            ))}
          </div>
        )}
        {error && catalog === null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Der Merkmals-Katalog konnte nicht geladen werden.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadTick((t) => t + 1)}
              data-testid="amenity-filter-retry"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Erneut versuchen
            </Button>
          </div>
        )}
        {!error && catalog !== null && (
          <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
            <legend className="sr-only">Ausstattungsmerkmale</legend>
            {catalog.map((amenity) => (
              <label key={amenity.key} className="flex cursor-pointer items-center gap-2 text-sm font-medium leading-none">
                <Checkbox
                  checked={selectedKeys.includes(amenity.key)}
                  onCheckedChange={(checked) => toggleAmenity(amenity.key, checked)}
                  data-testid={`amenity-filter-${amenity.key}`}
                  aria-label={amenity.label}
                />
                {amenity.label}
              </label>
            ))}
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}
