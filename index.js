import fs from 'fs';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

class CoffeeMachine {
  constructor(outlets, ingredients, recipes) {
    this.outlets = outlets;
    this.ingredients = ingredients;
    this.recipes = recipes;
  }

  async prepareBeverages() {
    const outletCount = this.outlets;
    const beverages = Object.keys(this.recipes);
  
    const workerPromises = [];
    for (const beverage of beverages) {
      try {
        // Check ingredients availability before starting preparation
        checkIngredientsAvailability(this.recipes[beverage], this.ingredients);
        const currentModuleFilePath = fileURLToPath(import.meta.url);
        const worker = new Worker(currentModuleFilePath, {
          workerData: { beverage, recipe: this.recipes[beverage], ingredients: this.ingredients }
        });
  
        workerPromises.push(new Promise((resolve, reject) => {
          worker.on('message', message => console.log(message));
          worker.on('error', reject);
        }));
      } catch (error) {
        console.log(`${beverage} cannot be prepared because ${error.message}`);
      }
    }
  
    await Promise.all(workerPromises);
  }
}

function prepareBeverage(beverage, recipe, ingredients) {
  try {
    checkIngredientsAvailability(recipe, ingredients);
    consumeIngredients(recipe, ingredients);
    return `${beverage} is prepared`;
  } catch (error) {
    return `${beverage} cannot be prepared because ${error.message}`;
  }
}

function checkIngredientsAvailability(recipe, ingredients) {
  for (const ingredient in recipe) {
    if (!ingredients[ingredient]) {
      throw new Error(`${ingredient} is not available`);
    }
    if (ingredients[ingredient] < recipe[ingredient]) {
      throw new Error(`item ${ingredient} is not sufficient`);
    }
  }
}

function consumeIngredients(recipe, ingredients) {
  for (const ingredient in recipe) {
    ingredients[ingredient] -= recipe[ingredient];
  }
}

// if (!isMainThread) {
//   const { beverage, recipe, ingredients } = workerData;
//   const result = prepareBeverage(beverage, recipe, ingredients);
//   parentPort.postMessage(result);
// }

function loadCoffeeMachineData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const { machine } = JSON.parse(data);
    return new CoffeeMachine(
      machine.outlets.count_n,
      machine.total_items_quantity,
      machine.beverages
    );
  } catch (error) {
    console.error("Error loading data:", error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node index.js <input_file>");
    process.exit(1);
  }

  const inputFilePath = args[0];
  const coffeeMachine = loadCoffeeMachineData(inputFilePath);
  await coffeeMachine.prepareBeverages();
}

if (isMainThread) {
  main();
}else {
    const { beverage, recipe, ingredients } = workerData;
    const result = prepareBeverage(beverage, recipe, ingredients);
    parentPort.postMessage(result);
}
