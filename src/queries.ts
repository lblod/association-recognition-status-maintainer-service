import { query, sparqlEscapeUri, sparqlEscapeDate, update } from "mu";
import { RECOGNITION_STATUS_CODES } from "./constants";

export const retrieveAssociations = async (
  periodOrRecognitionOrAssociationUris: string[],
) => {
  if (!periodOrRecognitionOrAssociationUris.length) {
    return [];
  }
  const sparqlQuery = /* sparql */ `
    PREFIX fv: <https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#>

    SELECT DISTINCT ?association
    WHERE {
      
      {
        VALUES ?association {
          ${periodOrRecognitionOrAssociationUris.map(sparqlEscapeUri).join("\n")}
        }
        ?association a fv:Vereniging.
      }
      UNION
      {
        VALUES ?recognition {
          ${periodOrRecognitionOrAssociationUris.map(sparqlEscapeUri).join("\n")}
        }
        ?association 
          a fv:Vereniging;
          fv:heeftErkenning ?recognition.
      }
      UNION
      {
        VALUES ?period {
          ${periodOrRecognitionOrAssociationUris.map(sparqlEscapeUri).join("\n")}
        }
        ?association 
          a fv:Vereniging;
          fv:heeftErkenning ?recognition.
        ?recognition fv:geldigheidsperiode ?period.
      }
    } 
  `;

  const response = await query(sparqlQuery);
  return response.results.bindings.map(
    (binding) => binding["association"].value,
  );
};

/**
 * Function which 'updates' the status for a given array of `recognitions`.
 * If `recognitions` is undefined, it updates the status of all `recognition` resources.
 */
export const updateAssociationStatuses = async (
  referenceDate: Date,
  associations?: string[],
) => {
  if (associations && !associations.length) {
    return;
  }
  const sparqlQuery = /* sparql */ `
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX fv: <https://data.vlaanderen.be/ns/FeitelijkeVerenigingen#>
    PREFIX m8g: <http://data.europa.eu/m8g/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      ?association ext:recognitionStatus ?oldStatus.
    }
    INSERT {
      ?association ext:recognitionStatus ?newStatus.
    }
    WHERE {
      ?association
        a fv:Vereniging.

      ${
        associations
          ? `VALUES ?association {
        ${associations?.map(sparqlEscapeUri).join("\n")}
      }`
          : ""
      }
      
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
    };
    DELETE {
      ?association ext:recognitionStatus ?oldStatus.
    }
    WHERE {
      ?association a fv:Vereniging ;
                  ext:recognitionStatus ?oldStatus .

      FILTER NOT EXISTS {
        ?association fv:heeftErkenning ?recognition.
      }

      ${
        associations
          ? `VALUES ?association {
        ${associations?.map(sparqlEscapeUri).join("\n")}
      }`
          : ""
      }
    }
  `;
  await update(sparqlQuery);
};
