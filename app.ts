import { app } from 'mu';
import bodyParser from 'body-parser';
import { DeltaBody, DeltaStatement } from './src/types';
import { retrieveAssociationsBasedOnRecognitionPeriods, updateAssociationStatuses } from './src/queries';
import { CronJob } from 'cron';
import { ENV } from './src/environment';
import { logger } from './src/support/logger';
import { errorHandler } from './src/middleware';
import { NextFunction, Request, Response } from 'express';
import AppError from './src/support/app-error';
import { StatusCodes } from 'http-status-codes';

app.use(bodyParser.json({ limit: "50mb" }))

app.post('/delta', async (req, res) => {
  const changesets = req.body as DeltaBody | undefined;
  if (!changesets || !changesets.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Request body does not contain any delta messages', true);
  }
  const statementFilter = (statement: DeltaStatement) => statement.predicate.value === 'http://data.europa.eu/m8g/startTime' || statement.predicate.value === 'http://data.europa.eu/m8g/endTime'
  const inserts = changesets.map((changeset) => changeset.inserts).flat().filter(statementFilter);
  const deletes = changesets.map((changeset) => changeset.deletes).flat().filter(statementFilter);

  const affectedSubjects = [...inserts, ...deletes].map(statement => statement.subject).map((uri) => uri.value);
  const associationsToUpdate = await retrieveAssociationsBasedOnRecognitionPeriods(affectedSubjects);
  if (!associationsToUpdate.length) {
    logger.debug('No associations resources found to update');
    return res.status(StatusCodes.OK).send();
  }

  const now = new Date();
  logger.debug(`Updating association statuses based on current time ${now}`)
  res.status(StatusCodes.ACCEPTED).send();
  await updateAssociationStatuses(now, associationsToUpdate);
});

app.post('/update-all', async (_req, res) => {
  logger.debug('Updating incorrect/missing/outdates association recognition-statuses')
  res.status(StatusCodes.ACCEPTED).send();
  const now = new Date();
  await updateAssociationStatuses(now);
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => errorHandler(err, res));

process.on('uncaughtException', (err) => {
  errorHandler(err);
});


CronJob.from({
  cronTime: ENV.CRON_PATTERN,
  onTick: async () => {
    logger.debug('Running cronjob to update incorrect/missing/outdates association recognition-statuses')
    const now = new Date();
    await updateAssociationStatuses(now);
  },
  runOnInit: ENV.RUN_CRONJOB_ON_START,
  waitForCompletion: true,
})

