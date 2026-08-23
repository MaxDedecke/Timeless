import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Inbox,
  MapPin,
  Pencil,
  Plus,
  RotateCw,
  SearchX,
  Users,
} from "lucide-react";

import { AmenityFilter } from "../components/AmenityFilter";
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

/**
 * Leerzustand „keine Treffer": von „noch keine Räume" getrennt – hier gibt es
 * Räume, aber keiner erfüllt die gewählte Merkmalskombination. Bietet den
 * Reset als direkte Aktion an (Akzeptanzkriterium 4 des Tickets).
 */
function NoMatchesEmpty({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <Card
      data-testid="rooms-no-match"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Keine Räume mit dieser Ausstattungskombination gefunden.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Weniger Merkmale gewählt? Setze den Filter zurück und versuche es
        erneut.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onResetFilters}>
        Filter zurücksetzen
    </Button>
    </Card>
  );
}

function RoomsEmpty({ retry }: { retry: () => void }) {
  return (
    <Card
      data-testid="rooms-empty"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Noch keine Räume angelegt.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Lege den ersten Raum mit Standort und Kapazität an, damit dein Team ihn
        finden und buchen kann.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {/* Anlegen-Call-to-action: echter Router-Link wie im Seitenkopf. */}
        <Button asChild size="sm" data-testid="rooms-empty-create">
          <Link to="/rooms/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Raum anlegen
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          data-testid="rooms-empty-retry"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Liste neu laden
        </Button>
      </div>
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
          <CardTitle className="text-lg font-semibold">
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
      <CardContent className="flex flex-col gap-3 pt-0">
        <div
          className="flex flex-wrap gap-1.5"
          data-testid={`room-amenities-${room.id}`}
        >
          {room.amenities.length === 0 ? (
            <span
              data-testid={`room-amenities-empty-${room.id}`}
              className="text-xs text-muted-foreground"
            >
              Keine Merkmale
            </span>
          ) : (
            room.amenities.map((amenity) => (
              <Badge
                key={amenity.key}
                data-testid={`room-amenity-badge-${amenity.key}`}
              >
                {amenity.label}
              </Badge>
            ))
          )}
        </div>
        {/* Zugang zum Raumkalender (Anforderung 1) und zur Raumverwaltung:
            raumspezifische URLs /rooms/:id und /rooms/:id/edit. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            className="self-start"
            data-testid={`room-calendar-${room.id}`}
          >
            <Link to={`/rooms/${room.id}`}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Kalender
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="self-start"
            data-testid={`room-edit-${room.id}`}
          >
            <Link to={`/rooms/${room.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Bearbeiten
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Seitenkopf je Ansicht (Konzept): Titel links, Primäraktion rechts.
 * Die Primäraktion „Raum anlegen" führt als echter Router-Link (Button-Look
 * via asChild) auf das Formular /rooms/new; je Raumzeile bietet RoomCard den
 * Bearbeiten-Zugang über /rooms/:id/edit.
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
      <Button asChild data-testid="room-create-link">
        <Link to="/rooms/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Raum anlegen
        </Link>
      </Button>
    </div>
  );
}

/**
 * Clientseitige Filterung mit AND-Logik: Ein Raum bleibt nur stehen, wenn er
 * ALLE gewählten Merkmale besitzt (Schnittmenge); ohne Auswahl bleiben alle
 * Räume sichtbar. Bewusst gegen die bereits geladene Liste – laut Ticket keine
 * Backend-Änderung.
 */
function filterRoomsByAmenities(rooms: Room[], selectedKeys: string[]): Room[] {
  if (selectedKeys.length === 0) return rooms;
  return rooms.filter((room) =>
    selectedKeys.every((key) => room.amenities.some((a) => a.key === key)),
  );
}

export default function RoomList() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [selectedAmenityKeys, setSelectedAmenityKeys] = useState<string[]>([]);

  const resetFilters = useCallback(() => setSelectedAmenityKeys([]), []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const rooms = await fetchRooms(signal);
      setState(rooms.length === 0 ? { phase: "empty" } : { phase: "ready", rooms });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // Unmount/Neuladen
      setState({ phase: "error" });
    }
  }, []);

  // Jeder Mount holt frisch: Der Listen-State lebt nur in dieser
  // Komponenteninstanz und wird nirgendwo gecacht – nach der Rückkehr aus dem
  // Anlegen-/Bearbeiten-Formular erscheinen neue bzw. geänderte Räume daher
  // ohne manuelles Neuladen.
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => {
    setState({ phase: "loading" });
    void load();
  }, [load]);

  const visibleRooms = useMemo(
    () =>
      state.phase === "ready"
        ? filterRoomsByAmenities(state.rooms, selectedAmenityKeys)
        : [],
    [state, selectedAmenityKeys],
  );

  return (
    <section aria-labelledby="rooms-heading">
      <PageHeader roomsCount={state.phase === "ready" ? state.rooms.length : 0} />

      {state.phase === "ready" && (
        <AmenityFilter
          selectedKeys={selectedAmenityKeys}
          onSelectionChange={setSelectedAmenityKeys}
        />
      )}

      {state.phase === "loading" && <RoomsSkeleton />}
      {state.phase === "error" && <RoomsError onRetry={retry} />}
      {state.phase === "empty" && <RoomsEmpty retry={retry} />}
      {state.phase === "ready" && visibleRooms.length === 0 && (
        <NoMatchesEmpty onResetFilters={resetFilters} />
      )}
      {state.phase === "ready" && visibleRooms.length > 0 && (
        <div
          data-testid="rooms-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visibleRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}
