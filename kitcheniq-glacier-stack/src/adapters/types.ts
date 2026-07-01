import type { Dish } from '../data/kitchenData';
export type KitchenIQDataProvider = {
  getRestaurant(): Promise<{name:string; city:string; owner?:string}>;
  getDashboard(): Promise<{healthy:number; watch:number; critical:number; margin:number; sales:string; cogs:string; revenue:string}>;
  getDishes(): Promise<Dish[]>;
  getIngredients(): Promise<string[][]>;
};
export type KitchenIQActions = {
  sendLoginCode(email:string): Promise<void> | void;
  applyRecommendation(dishId:string, change:unknown): Promise<void> | void;
  autoOrderIngredient(ingredientId:string): Promise<void> | void;
  downloadNutritionPdf(recipeId:string): Promise<void> | void;
};
