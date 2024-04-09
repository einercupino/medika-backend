const tf = require('@tensorflow/tfjs');
const path = require('path');
const csv = require('csvtojson');

const csvFilePath = path.join(__dirname, 'covid-symptoms-lite.csv');

const convertCsvToJson = async (csvFilePath) => {
    try {
        const jsonArray = await csv().fromFile(csvFilePath);
        return jsonArray;
    } catch (error) {
        console.error('Error converting CSV to JSON:', error);
        throw error;
    }
};

const processData = (data) => {
    return data.map(item => {
        let label;
        switch (item.Severity) {
            case 'Mild':
                label = [1, 0, 0, 0];
                break;
            case 'Moderate':
                label = [0, 1, 0, 0];
                break;
            case 'Severe':
                label = [0, 0, 1, 0];
                break;
            case 'None':
            default:
                label = [0, 0, 0, 1];
        }

        return {
            features: [
                item.Fever, item.Tiredness, item.DryCough, item.DifficultyinBreathing,
                item.SoreThroat, item.NoneSymptom, item.Pains, item.NasalCongestion,
                item.RunnyNose, item.Diarrhea, item.NoneExperiencing, item.ContactDontKnow,
                item.ContactNo, item.ContactYes
            ].map(Number),
            labels: label
        };
    });
};

const splitData = (processedData) => {
    if (!processedData || processedData.length === 0) {
        throw new Error('Processed data is invalid or empty.');
    }

    const shuffledData = processedData.slice().sort(() => Math.random() - 0.5);
    const splitIdx = Math.floor(shuffledData.length * 0.8);

    return {
        trainData: shuffledData.slice(0, splitIdx),
        testData: shuffledData.slice(splitIdx)
    };
};

const createModel = () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [14],
        units: 6,
        activation: 'sigmoid'
    }));
    model.add(tf.layers.dense({
        units: 3,
        activation: 'sigmoid'
    }));
    model.add(tf.layers.dense({
        units: 4,
        activation: 'softmax'
    }));
    model.compile({
        optimizer: tf.train.adam(0.06),
        loss: 'meanSquaredError',
        //loss: 'categoricalCrossentropy'
        metrics: ['accuracy']
    });
    return model;
};

const trainModel = async (model, trainData) => {
    const inputs = tf.tensor2d(trainData.map(d => d.features));
    const labels = tf.tensor2d(trainData.map(d => d.labels));
    return await model.fit(inputs, labels, { epochs: 10, validationSplit: 0.2 });
};

const evaluateModel = (model, testData) => {
  const testInputs = tf.tensor2d(testData.map(d => d.features));
  const testLabels = tf.tensor2d(testData.map(d => d.labels));
  const eval = model.evaluate(testInputs, testLabels);
  const loss = eval[0].dataSync()[0];
  const accuracy = eval[1].dataSync()[0];
  //console.log(`Evaluation results:\n Loss = ${loss}, Accuracy = ${accuracy}`);
  return { loss, accuracy };
};

const trainAndPredict = async (req, res) => {
  try {
      // Convert CSV file to JSON
      const rawData = await convertCsvToJson(csvFilePath);
      
      // Process the raw data
      const processedData = processData(rawData);
      
      // Split the processed data into training and test sets
      const { trainData, testData } = splitData(processedData);
      
      // Create and compile the model
      const model = createModel();
      
      // Train the model
      await trainModel(model, trainData);
      
      // Evaluate the model
      evaluateModel(model, testData);
      const evaluationResults = evaluateModel(model, testData);

      // Make predictions
      // input data
      //const inputData = req.body;

      const inputData = [
        {
            features: [
                1, 1, 1, 1, 1, 0,
                1, 1, 1, 1, 0, 1,
                0, 0
            ]
        },
      ];

      const exampleInputFeatures = tf.tensor2d(inputData.map(d => d.features));
      const predictions = model.predict(exampleInputFeatures).arraySync();
      
      // Send predictions as JSON response
      res.json({ predictions, evaluationResults });
  } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  trainAndPredict
};

/* TEST FUNCTION */ /*
(async () => {
    try {
        const rawData = await convertCsvToJson(csvFilePath);
        const processedData = processData(rawData);
        const { trainData, testData } = splitData(processedData);
        const model = createModel();
        await trainModel(model, trainData);
        evaluateModel(model, testData);

        // Make predictions
        const exampleInputData = [
            {
                features: [
                    1, 1, 1, 1, 1, 0,
                    1, 1, 1, 1, 0, 1,
                    0, 0
                ]
            },
        ];
        const exampleInputFeatures = tf.tensor2d(exampleInputData.map(d => d.features));
        const predictions = model.predict(exampleInputFeatures);
        predictions.print();
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
*/