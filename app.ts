import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import { DeltaBody, DeltaStatement } from './src/utils/types';
import { retrieveAssociationsBasedOnRecognitionPeriods, updateAssociationStatuses } from './src/queries';
import { CronJob } from 'cron';
import { ENV } from './src/environment';

app.use(bodyParser.json({ limit: "50mb" }))

app.post('/delta', async function (req, res) {
  const changesets = req.body as DeltaBody | undefined;
  if (!changesets || !changesets.length) {
    console.error('No delta found')
    return res.status(400).send();
  }
  const statementFilter = (statement: DeltaStatement) => statement.predicate.value === 'http://data.europa.eu/m8g/startTime' || statement.predicate.value === 'http://data.europa.eu/m8g/endTime'
  const inserts = changesets.map((changeset) => changeset.inserts).flat().filter(statementFilter);
  const deletes = changesets.map((changeset) => changeset.deletes).flat().filter(statementFilter);

  const affectedSubjects = [...inserts, ...deletes].map(statement => statement.subject).map((uri) => uri.value);
  const associationsToUpdate = await retrieveAssociationsBasedOnRecognitionPeriods(affectedSubjects);
    if (!inserts.length && !deletes.length) {
    console.log('No associations resources found to update');
    return res.status(200).send();
  }

  const now = new Date();
  console.log('Now: ', now);
  console.log(`Updating association statuses based on current time ${now}`)
  await updateAssociationStatuses(now, associationsToUpdate);
  return res.status(200).send();
});

app.use(errorHandler);


CronJob.from({
  cronTime: ENV.CRON_PATTERN,
  onTick: async () => {
    const now = new Date();
    console.log('Now: ', now);
    await updateAssociationStatuses(now);
  },
  runOnInit: ENV.RUN_CRONJOB_ON_START,
  waitForCompletion: true,
})