export type Status = 'healthy' | 'watch' | 'critical';
export type Dish = { id:string; name:string; category:string; price:number; cost:number; margin:number; profit:number; status:Status; delta:number };
export const restaurant = { name:'Spicehub Kitchen', city:'Bengaluru', owner:'Arjun' };
export const dishes:Dish[] = [
  { id:'butter-chicken', name:'Butter Chicken', category:'North Indian', price:285, cost:90.1, margin:68.5, profit:194.9, status:'healthy', delta:6.1 },
  { id:'paneer-tikka', name:'Paneer Tikka', category:'Tandoor', price:230, cost:155.5, margin:32.4, profit:74.5, status:'watch', delta:-2.3 },
  { id:'veg-biryani', name:'Veg Biryani', category:'Rice', price:210, cost:151, margin:28.1, profit:59, status:'watch', delta:-1.8 },
  { id:'chicken-biryani', name:'Chicken Biryani', category:'Rice', price:260, cost:227, margin:12.7, profit:33, status:'critical', delta:-6.3 },
  { id:'dal-makhani', name:'Dal Makhani', category:'Curry', price:195, cost:75.5, margin:61.3, profit:119.5, status:'healthy', delta:3.4 }
];
export const ingredients = [
  ['Basmati Rice','Grain / kg','₹118','+18%', 'spike'], ['Chicken Boneless','Protein / kg','₹310','+6%', ''], ['Fresh Cream','Dairy / L','₹210','+12%', ''], ['Tomatoes','Vegetable / kg','₹48','+4%', ''], ['Onions','Vegetable / kg','₹32','-2%', '']
];
export const metrics = { healthy:12, watch:4, critical:2, margin:28.6, sales:'₹2.48L', cogs:'₹1.77L', revenue:'₹17.24L' };
