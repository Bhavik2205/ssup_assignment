import fs from 'fs';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

class CoffeeMachine {
  constructor(outlets, ingredients, recipes) {
    this.outlets = outlets;
    this.ingredients = ingredients;
    this.recipes = recipes;
  }

  
  checkIngredientsAvailability(recipe, ingredients) {
    for (const ingredient in recipe) {
      if (!ingredients.hasOwnProperty(ingredient)) {
        throw new Error(`${ingredient} is not available`);
      }
    }
  
    for (const ingredient in recipe) {
      if (ingredients[ingredient] < recipe[ingredient]) {
        throw new Error(`item ${ingredient} is not sufficient`);
      }
    }
  }
  

  consumeIngredients(recipe, ingredients) {
    for (const ingredient in recipe) {
      ingredients[ingredient] -= recipe[ingredient];
    }
  }

  async prepareBeverages() {
    const beverages = Object.keys(this.recipes);
    const outletCount = this.outlets;

    // Iterate through the beverages and prepare them concurrently based on outlet count
    for (let i = 0; i < beverages.length; i += outletCount) {
      const batch = beverages.slice(i, i + outletCount);

      // Create promises for each batch
      const batchPromises = batch.map(beverage => {
        return new Promise((resolve, reject) => {
          const recipe = this.recipes[beverage];
          try {
            this.checkIngredientsAvailability(recipe, this.ingredients);
            this.consumeIngredients(recipe, this.ingredients);
            console.log(`${beverage} is prepared`);
            resolve();
          } catch (error) {
            console.log(`${beverage} cannot be prepared because ${error.message}`);
            resolve(); // Resolve the promise even if preparation fails
          }
        });
      });

      // Wait for all promises in the batch to complete before moving to the next batch
      await Promise.all(batchPromises);
    }
  }
}

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

  if (isMainThread) {
    await coffeeMachine.prepareBeverages();
  } else {
    // Handle beverage preparation in worker thread
    const { beverage } = workerData;
    try {
      await coffeeMachine.prepareBeverages();
      parentPort.postMessage(`${beverage} is prepared`);
    } catch (error) {
      parentPort.postMessage(`${beverage} cannot be prepared because ${error.message}`);
    }
  }
}

if (isMainThread) {
  main();
}




