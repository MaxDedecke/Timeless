import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, RotateCw } from "lucide-react";

import { ApiError } from "../api/http";
import { listAmenities, type Amenity } from "../api/amenities";
import { listLocations, type Location } from "../api/locations";
import { createRoom, getRoom, updateRoom } from "../api/rooms";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";

/**
 * Raum-Anlegen-/Bearbeiten-Formular: über /rooms/new (Anlegen) und
 * /rooms/:id/edit (Bearbeiten mit Vorausfüllung) erreichbar. Alle Fetches
 * laufen über die API-Clients mit relativen /api-Pfaden – im Browser-Code
 * steht nie ein Compose-Servicename. Zustände laut Design-Konzept: Skeleton
 * in Formularform beim Laden, destructives Alert mit „Erneut versuchen" bei
 * Ladefehlern, Feldfehler klein und rot unter dem jeweiligen Feld, Submit-
 * Button beim Speichern deaktiviert mit Inline-Spinner.
 */

export type RoomFormMode = "create" | "edit";

interface RoomFormProps {
  mode: RoomFormMode;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready" };

interface FieldErrors {
  name?: string;
  locationId?: string;
  capacity?: string;
}

/** Einheitlicher Eingaben-Stil (Tokens wie ui/button, kein eigener Hex-Wert). */
const inputClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function FormSkeleton() {
  return (
    <Card data-testid="room-form-loading" aria-busy="true">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-24" />
              </span>
            ))}
          </div>
        </div>
        <Skeleton className="ml-auto h-10 w-36" />
      </CardContent>
    </Card>
  );
}

export default function RoomForm({ mode }: RoomFormProps) {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [locations, setLocations] = useState<Location[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Raum-ID aus der Route; nicht-numerische IDs werden ohne unnötigen
  // Request direkt wie ein 404 behandelt (gleiche Semantik wie die API).
  const rawId = isEdit ? params.id : undefined;
  const parsedId = rawId !== undefined ? Number(rawId) : NaN;
  const roomIdGueltig = rawId !== undefined && Number.isInteger(parsedId) && parsedId >= 1;

  // Standort- und Merkmals-Katalog für die Auswahlfelder; im Bearbeiten-Modus
  // zusätzlich der Raum selbst als Vorausfüllung. Ein Ladefehler jeder der
  // drei Quellen führt in den gemeinsamen Fehlerzustand mit Wiederholung.
  useEffect(() => {
    let aktiv = true;
    if (isEdit && !roomIdGueltig) {
      setLoadState({ phase: "error", message: "Raum nicht gefunden." });
      return;
    }
    setLoadState({ phase: "loading" });
    void (async () => {
      try {
        const [standorte, katalog, raum] = await Promise.all([
          listLocations(),
          listAmenities(),
          isEdit ? getRoom(parsedId) : Promise.resolve(null),
        ]);
        if (!aktiv) return;
        setLocations(standorte);
        setAmenities(katalog);
        if (raum !== null) {
          setName(raum.name);
          setLocationId(String(raum.locationId));
          setCapacity(String(raum.capacity));
          setSelectedKeys(raum.amenities.map((a) => a.key));
        }
        setLoadState({ phase: "ready" });
      } catch (err) {
        if (!aktiv) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Beim Laden ist ein Fehler aufgetreten. Bitte versuche es erneut.";
        setLoadState({ phase: "error", message });
      }
    })();
    return () => {
      aktiv = false;
    };
  }, [isEdit, parsedId, roomIdGueltig, reloadTick]);

  const toggleAmenity = useCallback((key: string, checked: boolean | "indeterminate") => {
    if (!checked) {
      setSelectedKeys((keys) => keys.filter((k) => k !== key));
    } else {
      setSelectedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
    }
  }, []);

  // Pflichtfeld-Prüfung clientseitig (Anforderung 1): Name nicht leer,
  // Standort gewählt, Kapazität ganze Zahl größer 0.
  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (name.trim() === "") {
      errors.name = "Bitte gib einen Namen für den Raum ein.";
    }
    if (locationId === "") {
      errors.locationId = "Bitte wähle einen Standort aus.";
    }
    const cap = capacity.trim() === "" ? NaN : Number(capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      errors.capacity = "Die Kapazität muss eine ganze Zahl größer als 0 sein.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      locationId: Number(locationId),
      capacity: Number(capacity),
      // Komplett-Ersetzung der Zuordnung (PUT/POST-Semantik der API): eine
      // abgewählte Checkbox entfernt das Merkmal damit ebenfalls.
      amenities: selectedKeys,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateRoom(parsedId, payload);
      } else {
        await createRoom(payload);
      }
      navigate("/rooms");
    } catch (err) {
      setSaving(false);
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut."
      );
    }
  };

  const titel = isEdit ? "Raum bearbeiten" : "Raum anlegen";

  return (
    <section aria-labelledby="room-form-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="room-form-heading" className="text-2xl font-semibold tracking-tight">
            {titel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "Ändere Name, Standort, Kapazität oder Ausstattung des Raums."
              : "Lege einen Raum mit Name, Standort und Kapazität an."}
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/rooms">Zurück zur Raumliste</Link>
        </Button>
      </div>

      {loadState.phase === "loading" && <FormSkeleton />}

      {loadState.phase === "error" && (
        <Alert variant="destructive" data-testid="room-form-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isEdit ? "Raum konnte nicht geladen werden" : "Formular konnte nicht geladen werden"}
          </AlertTitle>
          <AlertDescription>
            {loadState.message}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setReloadTick((t) => t + 1)}
                data-testid="room-form-retry"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Erneut versuchen
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/rooms">Zurück zur Raumliste</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loadState.phase === "ready" && (
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Raumdaten" : "Neuer Raum"}</CardTitle>
            <CardDescription>
              Pflichtfelder sind Name, Standort und Kapazität.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form data-testid="room-form" noValidate onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="room-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="room-name"
                  data-testid="room-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  aria-invalid={fieldErrors.name !== undefined}
                  aria-describedby={fieldErrors.name !== undefined ? "room-name-error" : undefined}
                />
                {fieldErrors.name !== undefined && (
                  <p id="room-name-error" data-testid="room-name-error" className="text-xs text-destructive">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="room-location" className="text-sm font-medium">
                    Standort
                  </label>
                  <select
                    id="room-location"
                    data-testid="room-location"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className={inputClass}
                    aria-invalid={fieldErrors.locationId !== undefined}
                    aria-describedby={
                      fieldErrors.locationId !== undefined ? "room-location-error" : undefined
                    }
                  >
                    <option value="">Bitte wählen …</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.locationId !== undefined && (
                    <p
                      id="room-location-error"
                      data-testid="room-location-error"
                      className="text-xs text-destructive"
                    >
                      {fieldErrors.locationId}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="room-capacity" className="text-sm font-medium">
                    Kapazität
                  </label>
                  <input
                    id="room-capacity"
                    data-testid="room-capacity"
                    type="number"
                    min={1}
                    step={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className={inputClass}
                    aria-invalid={fieldErrors.capacity !== undefined}
                    aria-describedby={
                      fieldErrors.capacity !== undefined ? "room-capacity-error" : undefined
                    }
                  />
                  {fieldErrors.capacity !== undefined && (
                    <p
                      id="room-capacity-error"
                      data-testid="room-capacity-error"
                      className="text-xs text-destructive"
                    >
                      {fieldErrors.capacity}
                    </p>
                  )}
                </div>
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Ausstattung</legend>
                <p className="text-xs text-muted-foreground">
                  Optionale Merkmale zuordnen – Abwählen entfernt die Zuordnung.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                  {amenities.map((amenity) => (
                    <label
                      key={amenity.key}
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium leading-none"
                    >
                      <Checkbox
                        checked={selectedKeys.includes(amenity.key)}
                        onCheckedChange={(checked) => toggleAmenity(amenity.key, checked)}
                        data-testid={`room-amenity-${amenity.key}`}
                        aria-label={amenity.label}
                      />
                      {amenity.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {saveError !== null && (
                <Alert variant="destructive" data-testid="room-save-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Speichern fehlgeschlagen</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link to="/rooms">Abbrechen</Link>
                </Button>
                <Button type="submit" disabled={saving} data-testid="room-submit">
                  {saving && (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                  )}
                  {isEdit ? "Änderungen speichern" : "Raum anlegen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
