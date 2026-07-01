import { dishes, ingredients, metrics, restaurant } from '../data/kitchenData';
import type { KitchenIQActions, KitchenIQDataProvider } from './types';
export const mockProvider:KitchenIQDataProvider = {
  async getRestaurant(){ return restaurant }, async getDashboard(){ return metrics }, async getDishes(){ return dishes }, async getIngredients(){ return ingredients }
};
export const mockActions:KitchenIQActions = {
  sendLoginCode: email => console.log('sendLoginCode', email),
  applyRecommendation: (dishId, change) => console.log('applyRecommendation', dishId, change),
  autoOrderIngredient: ingredientId => console.log('autoOrderIngredient', ingredientId),
  downloadNutritionPdf: recipeId => console.log('downloadNutritionPdf', recipeId)
};
