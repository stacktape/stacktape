import { sequential, layers } from '@tensorflow/tfjs-node';

const model = sequential();
model.add(
  layers.conv2d({
    inputShape: [28, 28, 1],
    filters: 32,
    kernelSize: 3,
    activation: 'relu'
  })
);
model.add(
  layers.conv2d({
    filters: 32,
    kernelSize: 3,
    activation: 'relu'
  })
);
model.add(layers.maxPooling2d({ poolSize: [2, 2] }));
model.add(
  layers.conv2d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu'
  })
);
model.add(
  layers.conv2d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu'
  })
);
model.add(layers.maxPooling2d({ poolSize: [2, 2] }));
model.add(layers.flatten());
model.add(layers.dropout({ rate: 0.25 }));
model.add(layers.dense({ units: 512, activation: 'relu' }));
model.add(layers.dropout({ rate: 0.5 }));
model.add(layers.dense({ units: 10, activation: 'softmax' }));

const optimizer = 'rmsprop';
model.compile({
  optimizer,
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy']
});

export default model;
