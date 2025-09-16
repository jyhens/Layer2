"# Layer2 Project" 


- ich habe Models definiert:
  - `Employee` (Mitarbeiter)
  - `Customer` (Kunde)
  - `Project` (Projekt mit Start/Ende)
  - `ProjectAssignment` (Zuordnung Mitarbeiter↔Projekt) Damit die Beziehung Mitarbeiter↔Projekt sauber ist und später erweiterbar (z. B. Zeitraum, Rolle). Für Konfliktprüfung ist klar: „Gehört Mitarbeiter am Tag X zu Projekt Y?“
  - `LeaveRequest` (Urlaubsantrag für *einen Tag*) 
  - `LeaveStatus` (Requested/Approved/Rejected/Cancelled)

- Ich habe EF Core mit SQLite verbunden
- `LeavePlannerDbContext`  erstellt 
- `leaveplanner.db` ist die Datenbank
- the Connection String (SQLite-Datei) steht in `appsettings.json`

- Ich habe Controllers erstellt 
  - EmployeesController (/api/employees)
    - GET /api/employees → Liste aller Mitarbeitenden (Id, Name, JobTitle)
    - GET /api/employees/{id} → Einzelner Mitarbeiter
    - POST /api/employees → Neuen Mitarbeiter anlegen (Name, JobTitle) Validierung: Name nötig
    - PUT /api/employees/{id} → Mitarbeiter ändern (Name, JobTitle) Validierung: Name nötig
    - DELETE /api/employees/{id} → Löschen
  - CustomersController (/api/customers)
    - GET/GET{id}/POST/PUT/DELETE (analog Employees) Validierung: Name nötig
  - ProjectsController (/api/projects)
    - GET /api/projects → Liste inkl. Kunde, Start/Ende
    - GET /api/projects/{id} → Einzelnes Projekt
    - POST /api/projects → Neues Projekt (Name, customerId, StartDate, EndDate?) Validierung: Kunde muss existieren;
    - PUT /api/projects/{id} → Projekt ändern (wie oben)
    - DELETE /api/projects/{id} → Löschen
    - GET /api/projects/{projectId}/assignments → Liste der zugeordneten Mitarbeitenden
    - DELETE /api/projects/{projectId}/assignments/{employeeId} → Zuordnung entfernen Antworten: 204 bei Erfolg, 404 wenn Zuordnung fehlt
    - POST /api/projects/{projectId}/assignments → Mitarbeiter dem Projekt zuordnen (employeeId) Validierung: Projekt & Mitarbeiter müssen existieren; keine Doppelzuordnung (sonst 409)
  - LeavesController (/api/leaves)
    - GET /api/leaves?employeeId=&date= → Liste/Filter (zur Kontrolle)
    - GET /api/leaves/{id} → Einzelner Antrag
    - POST /api/leaves (Beantragen) Body: employeeId, date Ergebnis: Leave mit Status Requested; Validierungen: Employee existiert und pro Mitarbeiter max. 1 Antrag pro Datum (sonst 409 Conflict)
    - POST /api/leaves/{id}/approve (Genehmige) Ergebnis: Leave `Approved` plus `conflictHints` 
    - POST `/api/leaves/{id}/reject` (Ablehnen) Ergebnis:_Leave mit `status = Rejected` Konflikte: nicht erforderlich
    **Konflikthinweise:**
    - Kein Projekt am Tag → conflictHints: [] (auch wenn andere irgendwo Urlaub haben, es betrifft dich ohne gemeinsames Projekt nicht).
    - Ein Projekt, ein Konflikt → eine conflictHints-Zeile, ein employees-Eintrag (ein genehmigter Urlaub eines Kollegen).
    - Mehrere Projekte, mehrere Konflikte → mehrere conflictHints-Zeilen (je Projekt gruppiert; pro betroffenem Projekt ein Eintrag).
    - Gleicher Kollege in zwei gemeinsamen Projekten → er steht in beiden Projekthinweisen (weil beide Projekte betroffen sind).
    - Andere nur „Requested“ (nicht Approved) → bei Beantragung **kein** Konflikt (zählt erst bei Genehmigung).
    - Pro Mitarbeiter & Tag max. 1 Antrag → 409 Conflict 
    - Unbekannter EmployeeId → 400 Bad Request
    - Bei Genehmigung eines Antrags → Konfliktprüfung gegen **Approved + Requested** anderer (conflictHints können größer ausfallen).




**Befehle:**
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update

**Run Befehle:**
dotnet run --launch-profile "DevHttps"
dotnet run --launch-profile "ProdHttp"
tagging: git tag -a v0.1-eod -m "End of day snapshot" 