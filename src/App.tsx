import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ProtectedRoute from './components/layout/ProtectedRoute'
import PublicRoute from './components/layout/PublicRoute'

import LoadingScreen from './screens/LoadingScreen'
import SplashScreen from './screens/SplashScreen'
import OtpScreen from './screens/OtpScreen'
import RestaurantSetupScreen from './screens/RestaurantSetupScreen'
import MenuImportScreen from './screens/MenuImportScreen'
import AiParserScreen from './screens/AiParserScreen'
import IngredientPickerScreen from './screens/IngredientPickerScreen'
import DashboardScreen from './screens/DashboardScreen'
import RecipeListScreen from './screens/RecipeListScreen'
import AddRecipeScreen from './screens/AddRecipeScreen'
import RecipeDetailScreen from './screens/RecipeDetailScreen'
import EditRecipeScreen from './screens/EditRecipeScreen'
import NutritionScreen from './screens/NutritionScreen'
import IngredientManagerScreen from './screens/IngredientManagerScreen'
import IngredientDetailScreen from './screens/IngredientDetailScreen'
import InsightsScreen from './screens/InsightsScreen'
import AlertDetailScreen from './screens/AlertDetailScreen'
import SettingsScreen from './screens/SettingsScreen'
import AlertsListScreen from './screens/AlertsListScreen'
import AutopilotScreen from './screens/AutopilotScreen'
import IntelligenceHubScreen from './screens/IntelligenceHubScreen'
import MoreScreen from './screens/MoreScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

const springTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
}

const pageVariants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit:    { scale: 0.94, opacity: 0 },
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={location.key}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={springTransition}
        style={{
          minHeight: '100vh',
          overflow: 'auto',
          backgroundColor: '#0C111B',
          position: 'relative',
        }}
      >
        <Routes location={location}>
          {/* Root */}
          <Route path="/" element={
            <ProtectedRoute><LoadingScreen /></ProtectedRoute>
          } />

          {/* Public */}
          <Route path="/login" element={
            <PublicRoute><SplashScreen /></PublicRoute>
          } />
          <Route path="/otp"   element={<OtpScreen />} />
          <Route path="/setup" element={<RestaurantSetupScreen />} />

          {/* Onboarding */}
          <Route path="/onboarding/import"      element={<MenuImportScreen />} />
          <Route path="/onboarding/parse"       element={<AiParserScreen />} />
          <Route path="/onboarding/ingredients" element={<IngredientPickerScreen />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardScreen /></ProtectedRoute>
          } />
          <Route path="/recipes" element={
            <ProtectedRoute><RecipeListScreen /></ProtectedRoute>
          } />
          <Route path="/recipes/new" element={
            <ProtectedRoute><AddRecipeScreen /></ProtectedRoute>
          } />
          <Route path="/recipes/:id" element={
            <ProtectedRoute><RecipeDetailScreen /></ProtectedRoute>
          } />
          <Route path="/recipes/:id/edit" element={
            <ProtectedRoute><EditRecipeScreen /></ProtectedRoute>
          } />
          <Route path="/recipes/:id/nutrition" element={
            <ProtectedRoute><NutritionScreen /></ProtectedRoute>
          } />
          <Route path="/ingredients" element={
            <ProtectedRoute><IngredientManagerScreen /></ProtectedRoute>
          } />
          <Route path="/ingredients/:id" element={
            <ProtectedRoute><IngredientDetailScreen /></ProtectedRoute>
          } />
          <Route path="/insights" element={
            <ProtectedRoute><InsightsScreen /></ProtectedRoute>
          } />
          <Route path="/alerts/:id" element={
            <ProtectedRoute><AlertDetailScreen /></ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute><AlertsListScreen /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsScreen /></ProtectedRoute>
          } />
          <Route path="/autopilot" element={
            <ProtectedRoute><AutopilotScreen /></ProtectedRoute>
          } />
          <Route path="/intelligence" element={
            <ProtectedRoute><IntelligenceHubScreen /></ProtectedRoute>
          } />
          <Route path="/more" element={
            <ProtectedRoute><MoreScreen /></ProtectedRoute>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
