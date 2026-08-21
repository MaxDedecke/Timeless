import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Inbox, MapPin, Plus, RotateCw, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

/**
 * Raumliste (Startseite): lädt alle Räume vom Backend über den relativen
 * Pfad /api/rooms – der Frontend-Container reicht /api als Reverse-Proxy an
 * das Backend im Compose-Netz weiter; im Browser-Code steht nie ein
 * Servicename. Gestaltete Zustände laut Konzept: Skeleton-Karten beim Laden,
 * EmptyState bei leerer Liste, destructives Alert mit „Erneut versuchen" bei
 * API-Fehlern.
 */

/** Ausstattungsmerkmal aus dem festen Katalog (key + Anzeige-Label). */
export interface RoomAmenity {
  key: string;
  label: string;
}

export interface RoomLocation {
  id: number;
  name: string;
}

/** Form von GET /api/rooms (backend/src/services/rooms.ts). */
export interface Room {
  id: number;
  name: string;
  locationId: number;
  capacity: number;
  amenities: RoomAmenity[];
  location: RoomLocation;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "empty" }
  | { phase: "ready"; rooms: Room[] };

async function fetchRooms(signal?: AbortSignal): Promise<Room[]> {
  // Bewusst relativ: derselbe Ursprung, unter dem diese Seite läuft.
  const res = await fetch("/api/rooms", { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as Room[];
}

function RoomsSkeleton() {
  return (
    <div
      data-testid="rooms-loading"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            {/* Ladezustand in der Layoutform der Zielsicht (Konzept). */}
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RoomsEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card
      data-testid="rooms-empty"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Es sind noch keine Räume angelegt.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Sobald ein Facility-Manager Räume mit Standort und Kapazität anlegt,
        erscheinen sie hier.
      </p>
      {onRetry !== undefined && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Liste neu laden
        </Button>
      )}
    </Card>
  );
}

interface RoomsErrorProps {
  onRetry: () => void;
}

function RoomsError({ onRetry }: RoomsErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Räume konnten nicht geladen werden</AlertTitle>
      <AlertDescription>
        Der Server ist momentan nicht erreichbar oder meldet einen Fehler.
        <div className="mt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="rooms-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function RoomCard({ room }: { room: Room }) {
  return (
    <Card data-testid="room-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight tracking-tight">
            {room.name}
          </CardTitle>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>
              {room.capacity} <span className="sr-only">Personen</span>
            </span>
          </span>
        </div>
        <CardDescription className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {room.location?.name ?? "Ohne Standort"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5 pt-0">
        {room.amenities.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Keine Ausstattung hinterlegt
          </span>
        ) : (
          room.amenities.map((amenity) => (
            <Badge key={amenity.key}>{amenity.label}</Badge>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Seitenkopf je Ansicht (Konzept): Titel links, Primäraktion rechts.
 * Die Aktion „Raum anlegen" ist verdrahtet, sobald die Raumverwaltung kommt.
 */
function PageHeader({ roomsCount }: { roomsCount: number }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Räume</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle Räume der DesignFreak GmbH
          {roomsCount > 0 && (
            <>
              {" · "}
              <span className="tabular-nums">{roomsCount}</span> Räume
            </>
          )}
        </p>
      </div>
      <Button disabled title="Kommt mit der Raumverwaltung">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Raum anlegen
      </Button>
    </div>
  );
}

export default function RoomList() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const rooms = await fetchRooms(signal);
      setState(rooms.length === 0 ? { phase: "empty" } : { phase: "ready", rooms });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // Unmount/Neuladen
      setState({ phase: "error" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => {
    setState({ phase: "loading" });
    void load();
  }, [load]);

  return (
    <section aria-labelledby="rooms-heading">
      <PageHeader roomsCount={state.phase === "ready" ? state.rooms.length : 0} />

      {state.phase === "loading" && <RoomsSkeleton />}
      {state.phase === "error" && <RoomsError onRetry={retry} />}
      {state.phase === "empty" && <RoomsEmpty onRetry={retry} />}
      {state.phase === "ready" && (
        <div
          data-testid="rooms-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {state.rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}
