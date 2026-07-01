# KitchenIQ Glacier Stack

A reusable React + TypeScript UI stack for the KitchenIQ Glacier mobile experience. It includes all 9 screens, Indian-kitchen AI imagery, design tokens, reusable components, mock data, and adapter interfaces so it can be integrated with existing design systems and business logic.

## Included screens

1. Login / Splash with Indian kitchen AI background
2. Dashboard
3. Recipe Detail
4. Add Recipe
5. Ingredients
6. Nutrition Label
7. Menu Optimizer
8. Operations Autopilot
9. Intelligence Hub

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL in your browser.

## Integrating with an existing app

The UI is intentionally separated from business logic:

- `src/styles/tokens.css` contains Glacier theme tokens. Replace these variables or map them into your design system.
- `src/components/*` contains reusable cards, gauges, nav, pills, rows, charts, and phone shell components.
- `src/screens/Screens.tsx` contains screen compositions. You can copy individual screen components into your router.
- `src/adapters/types.ts` defines `KitchenIQDataProvider` and `KitchenIQActions` contracts.
- `src/adapters/mockProvider.ts` shows how to plug in mock data. Replace it with Supabase, REST, GraphQL, Firebase, or your existing service layer.
- `src/assets/*` contains the Indian kitchen AI-style image assets used by Login and Autopilot.

## Suggested production wiring

```ts
const provider: KitchenIQDataProvider = {
  getRestaurant: () => api.restaurant.current(),
  getDashboard: () => api.analytics.dashboard(),
  getDishes: () => api.recipes.listWithMargins(),
  getIngredients: () => api.ingredients.priceWatch()
};

const actions: KitchenIQActions = {
  sendLoginCode: email => auth.sendOtp(email),
  applyRecommendation: (dishId, change) => optimizer.apply(dishId, change),
  autoOrderIngredient: ingredientId => procurement.autoOrder(ingredientId),
  downloadNutritionPdf: recipeId => nutrition.downloadPdf(recipeId)
};
```

## Notes

This is a front-end implementation starter, not a complete backend. It has no locked dependency on a router, backend, auth provider, or state manager.
