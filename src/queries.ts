import { query, sparqlEscapeUri, sparqlEscapeDate, update } from "mu"
import { RECOGNITION_STATUS_CODES } from "./constants";


export const retrieveAssociationsBasedOnRecognitionPeriods = async (periodUris: string[]) => {
  if(!periodUris.length){
    return [];
  }
  const sparqlQuery = /* sparql */`
    PREFIX fv: <https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#>

    SELECT DISTINCT ?association
    WHERE {
      GRAPH <http://mu.semte.ch/graphs/organizations> {
        ?association
          a fv:Vereniging;
          fv:heeftErkenning ?recognition.
        ?recognition 
          a fv:Erkenning;
          fv:geldigheidsperiode ?period.
        VALUES ?period {
          ${periodUris.map(sparqlEscapeUri).join('\n')}
        }
      }
    } 
  `;

  const response = await query(sparqlQuery, { sudo: true });
  return response.results.bindings.map((binding) => binding['association'].value);
}

/**
 * Function which 'updates' the status for a given array of `recognitions`.
 * If `recognitions` is undefined, it updates the status of all `recognition` resources.
 */
export const updateAssociationStatuses = async (referenceDate: Date, associations?: string[]) => {
  if (associations && !associations.length) {
    return;
  }
  const sparqlQuery = /* sparql */`
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX fv: <https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#>
    PREFIX m8g: <http://data.europa.eu/m8g/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      GRAPH <http://mu.semte.ch/graphs/organizations> {
        ?association ext:recognitionStatus ?oldStatus.
      }
    }
    INSERT {
      GRAPH <http://mu.semte.ch/graphs/organizations> {
        ?association ext:recognitionStatus ?newStatus.
      }
    }
    WHERE {
      GRAPH <http://mu.semte.ch/graphs/organizations> {
        ?association
          a fv:Vereniging.

        ${associations ? `VALUES ?association {
          ${associations?.map(sparqlEscapeUri).join('\n')}
        }` : ''}
        
        OPTIONAL {
          ?association ext:recognitionStatus ?oldStatus.
        }

        BIND(EXISTS {
          ?association fv:heeftErkenning ?recognition.
            ?recognition fv:geldigheidsperiode ?period.
            ?period 
              m8g:startTime ?recognitionStart;
              m8g:endTime ?recognitionEnd.
            FILTER(
              ?recognitionStart <= ${sparqlEscapeDate(referenceDate)} &&
              ?recognitionEnd   >= ${sparqlEscapeDate(referenceDate)}
            )
        } AS ?hasActiveRecognition)

        BIND(EXISTS {
          ?association fv:heeftErkenning ?recognition.
            ?recognition fv:geldigheidsperiode ?period.
            ?period 
              m8g:startTime ?recognitionStart;
              m8g:endTime ?recognitionEnd.
            FILTER(
              ?recognitionEnd < ${sparqlEscapeDate(referenceDate)}
            )
        } AS ?hasExpiredRecognition)

        BIND(EXISTS {
          ?association fv:heeftErkenning ?recognition.
            ?recognition fv:geldigheidsperiode ?period.
            ?period 
              m8g:startTime ?recognitionStart;
              m8g:endTime ?recognitionEnd.
            FILTER(
              ?recognitionStart > ${sparqlEscapeDate(referenceDate)}
            )
        } AS ?hasUpcomingRecognition)

        {
          BIND(${sparqlEscapeUri(RECOGNITION_STATUS_CODES.ACTIVE)} AS ?newStatus)
          FILTER(?hasActiveRecognition)
        }
        UNION
        {
          BIND(${sparqlEscapeUri(RECOGNITION_STATUS_CODES.EXPIRED)} AS ?newStatus)
          FILTER(?hasExpiredRecognition && !?hasActiveRecognition && !?hasUpcomingRecognition)
        }
        UNION
        {
          BIND(${sparqlEscapeUri(RECOGNITION_STATUS_CODES.UPCOMING)} AS ?newStatus)
          FILTER(!?hasActiveRecognition && ?hasUpcomingRecognition)
        }

        FILTER(
          ?hasActiveRecognition ||
          ?hasUpcomingRecognition ||
          ?hasExpiredRecognition
        )

        FILTER(!BOUND(?oldStatus) || ?oldStatus != ?newStatus)
      }
    }
  `
  await update(sparqlQuery, { sudo: true });
}