-- KitchenIQ — Reference Ingredient Library
-- Seed: 001_ingredients.sql
-- Delhi metro prices, mid-2025. Owners update their own prices after onboarding.
-- All prices are price_per_kg equivalent.
-- Special units: 'litre' (cream, milk, oils), 'piece' (eggs)

INSERT INTO ingredient_library (name, price_per_kg, unit, category) VALUES

-- Vegetables
('Tomato',          60,   'kg',    'Vegetables'),
('Onion',           40,   'kg',    'Vegetables'),
('Potato',          30,   'kg',    'Vegetables'),
('Garlic',         200,   'kg',    'Vegetables'),
('Ginger',         160,   'kg',    'Vegetables'),
('Green Chilli',    80,   'kg',    'Vegetables'),
('Coriander',      120,   'kg',    'Vegetables'),
('Capsicum',        80,   'kg',    'Vegetables'),
('Spinach',         60,   'kg',    'Vegetables'),
('Peas',           100,   'kg',    'Vegetables'),
('Cauliflower',     50,   'kg',    'Vegetables'),
('Carrot',          60,   'kg',    'Vegetables'),

-- Dairy
('Paneer',         380,   'kg',    'Dairy'),
('Butter',         500,   'kg',    'Dairy'),
('Ghee',           700,   'kg',    'Dairy'),
('Fresh Cream',    400,   'litre', 'Dairy'),
('Curd',            80,   'kg',    'Dairy'),
('Milk',            60,   'litre', 'Dairy'),

-- Meat & Eggs
('Chicken',        220,   'kg',    'Meat & Eggs'),
('Mutton',         600,   'kg',    'Meat & Eggs'),
('Eggs',             8,   'piece', 'Meat & Eggs'),

-- Oils
('Refined Oil',    150,   'litre', 'Oils'),
('Mustard Oil',    180,   'litre', 'Oils'),

-- Grains & Pulses
('Basmati Rice',   120,   'kg',    'Grains & Pulses'),
('Urad Dal',       140,   'kg',    'Grains & Pulses'),
('Chana Dal',      100,   'kg',    'Grains & Pulses'),
('Toor Dal',       130,   'kg',    'Grains & Pulses'),
('Maida',           45,   'kg',    'Grains & Pulses'),
('Atta',            50,   'kg',    'Grains & Pulses'),
('Besan',           80,   'kg',    'Grains & Pulses'),

-- Spices
('Cumin',          400,   'kg',    'Spices'),
('Coriander Powder',200,  'kg',    'Spices'),
('Turmeric',       300,   'kg',    'Spices'),
('Red Chilli Powder',250, 'kg',    'Spices'),
('Garam Masala',   600,   'kg',    'Spices'),
('Kasuri Methi',   800,   'kg',    'Spices'),

-- Dry Fruits & Nuts
('Cashew',         900,   'kg',    'Dry Fruits & Nuts'),
('Almond',        1200,   'kg',    'Dry Fruits & Nuts'),

-- Pantry
('Sugar',           45,   'kg',    'Pantry'),
('Salt',            25,   'kg',    'Pantry'),
('Tomato Puree Tin',120,  'kg',    'Pantry');
