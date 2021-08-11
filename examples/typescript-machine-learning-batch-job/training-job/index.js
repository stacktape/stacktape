import dataHandler from './data';
import model from './model';

async function run(epochs, batchSize) {
  await dataHandler.loadData();

  const { images: trainImages, labels: trainLabels } = dataHandler.getTrainData();
  model.summary();

  const validationSplit = 0.15;
  await model.fit(trainImages, trainLabels, {
    epochs,
    batchSize,
    validationSplit
  });

  const { images: testImages, labels: testLabels } = dataHandler.getTestData();
  const evalOutput = model.evaluate(testImages, testLabels);

  console.info(
    '\nEvaluation result:\n' +
      `  Loss = ${evalOutput[0].dataSync()[0].toFixed(3)}; ` +
      `Accuracy = ${evalOutput[1].dataSync()[0].toFixed(3)}`
  );

  await model.save('file:///tmp/trained-model');
}

// performing training

run(process.env.EPOCHS || 3, process.env.BATCH_SIZE || 128).catch((err) => {
  console.error(`Training failed with following error ${err}`);
  process.exitCode = 1;
  throw err;
});

// performing upload
