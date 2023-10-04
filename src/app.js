import fastify from 'fastify';
import fs from 'fs/promises';
const csvFilePath = 'src/data/city_populations.csv';

const app = fastify({ logger: true });
const port = 5555;

const cityPopulations = new Map();

// Load CSV data
async function loadCityPopulations() {
  try {
    const data = await fs.readFile(csvFilePath,'utf-8');
    const rows = data.trim().split('\n').map((row) => row.split(','));

    for (let [city, state, population] of rows) {
      const lowerCaseState = state.toLowerCase();
      const lowerCaseCity = city.toLowerCase();

      if (!cityPopulations.has(lowerCaseState)) {
        cityPopulations.set(lowerCaseState, new Map());
      }

      cityPopulations.get(lowerCaseState).set(lowerCaseCity, {
        state: state,
        city: city,
        population: parseInt(population)
      });
    }

    console.log('CSV file loaded.');
  } catch (error) {
    console.error('Error loading CSV file:', error);
    process.exit(1);
  }
}

// Get population
app.get('/api/population/state/:state/city/:city', (request, reply) => {
  let { state, city } = request.params;
  state = state.toLowerCase();
  city = city.toLowerCase();

  if (!cityPopulations.has(state) || !cityPopulations.get(state).has(city)) {
    reply.code(400).send({ error: 'City not found' });
    return;
  }

  const data = cityPopulations.get(state).get(city);
  reply.code(200).send({ population: data.population });
});

// Update population
app.put('/api/population/state/:state/city/:city', async (request, reply) => {
  let { state, city } = request.params;
  state = state.toLowerCase();
  city = city.toLowerCase();
  const population = parseInt(request.body);

  if (!cityPopulations.has(state)) {
    cityPopulations.set(state, new Map());
  }

  const stateMap = cityPopulations.get(state);
  const exist = !!stateMap.has(city);
  stateMap.set(city, {
    state: state,
    city: city,
    population: population
  });
  try {
    const updatedCSVContent = [];
    for (const [state, cityMap] of cityPopulations) {
      for (const [city, data] of cityMap) {
        updatedCSVContent.push(`${data.city},${data.state},${data.population}`);
      }
    }
    await fs.writeFile(csvFilePath, updatedCSVContent.join('\n'));
    if (exist)
      reply.code(200).send({ message: 'Population updated!' });
    else
      reply.code(201).send({ message: 'Population created!' })
  } catch (err) {
    console.error("Failed to write ", err.message);
    reply.code(400).send({ message: 'Data could not be saved, maybe the file was opened or locked!' });
  }

});


// Start the Fastify server
loadCityPopulations().then(() => {
  app.listen({ port }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server is running on port ${port}`);
  });
});

export default app;
