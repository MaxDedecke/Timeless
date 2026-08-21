# Timeless

Eigenes Raum Buchungssystem

Individualsoftware für **DesignFreak GmbH**, gebaut und gepflegt vom Agenten-Team der Beratung.

Der Auftrag liegt in `docs/konzept.md` und `docs/anforderungen.md`, das Verständnis des Teams in `docs/verstaendnis.md`.
Jeder Commit stammt von dem Teammitglied, das die Änderung verantwortet.

## Starten

```bash
docker compose up --build
```

Danach ist die Anwendung unter `http://localhost:8080` erreichbar (einziger
veröffentlichter Port). Die API hängt dahinter als `/api/...` und ist nur im
Compose-Netz über den Servicenamen `backend` adressiert; PostgreSQL läuft als
eigener Container (`postgres`) mit Volume `pgdata`.
