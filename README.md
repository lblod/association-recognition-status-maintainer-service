# Association-recognition-status-maintainer-service
Microservice responsible for computing/maintaining the the derived `http://data.lblod.info/vocabularies/FeitelijkeVerenigingen/recognitionStatus` predicate on `https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#Vereniging` resources.
The `ver:recognitionStatus` predicate is derived from `fv:Erkenning` resources linked to a `fv:Vereniging`. 
It indicates whether an association is:
- currently recognized
- will be recognized in the future
- was recognized in the past, but no longer is now

The range of `ver:recognitionStatus` is the `http://lblod.data.gift/concept-schemes/c78e079b-5f38-47fd-b284-f22b33172342` concept-scheme (Erkenning status code).
This concept-scheme contains the following concepts:
- `http://lblod.data.gift/concepts/0d2dc070-2c6d-4af3-bedc-3fd96c45bb3a` (Actief/Active)
- `http://lblod.data.gift/concepts/34ff67a0-8196-4228-937a-d3f46191c85b` (Verlopen/Expired)
- `http://lblod.data.gift/concepts/61875267-3045-4da7-9e38-ca7ddb7d3e3c` (Toekomstig/Upcoming)

The rules for determining the `ver:recognitionStatus` are as follows:
- If an association has a recognition which is currently active, it is assigned the 'Active' status
- If an association only has recognitions which are expired, it is assigned the 'Expired' status
- If an association has a future recognition (but no active recognition), it is assigned the 'Upcoming' status
- The status is removed when no recognition is linked to the association.

## Configuring this microservice
You may configure this microservice by including the following snippet in your docker compose file:
```yml
recognition-status-maintainer:
    image: lblod/association-recognition-status-maintainer-service:feature-initial-version
    environment:
      CRON_PATTERN: "<cron-pattern>"
      DEFAULT_MU_AUTH_SCOPE: <scope_that_has_access>
    volumes:
      # To sync your host timezone to your container
      - /etc/localtime:/etc/localtime:ro
```

If you want to use the delta-feature of this service, you'll also need to include the following snippet in your `delta/rules.js` file:
```json
  {
    match: {},
    callback: {
      url: "http://recognition-status-maintainer/delta",
      method: "POST"
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 10000,
      ignoreFromSelf: true,
      foldEffectiveChanges: true,
    }
  }
```
### Environment variables
- `CRON_PATTERN`: the cron pattern that is used by the cronjob which updates the recognition status (Default: none) (Required)
- `DEFAULT_MU_AUTH_SCOPE`: the mu-auth scope that is used when sending SPARQL queries to the database. This scope should have access to at least the following resource types:
  * `fv:Vereniging`
  * `fv:Erkenning`
  * `m8g:PeriodOfTime`
- `LOGGING_LEVEL`: the logging level used by the logger (Default: 'info')
- `RUN_CRONJOB_ON_START`: whether or not the cronjob should run when the service starts up (Default: `false`)

## Endpoints provided by this service:
- `POST /delta`: endpoint used by the `delta-notifier` service to send delta messages to
- `POST /update-all`: manual endpoint which can be used to bring all recognition-statuses up-to-date


## Prefixes used in this document
```
ver: <http://data.lblod.info/vocabularies/FeitelijkeVerenigingen/>
fv: <https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#>
m8g: <http://data.europa.eu/m8g/>
```