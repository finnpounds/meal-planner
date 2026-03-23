import type { Metadata } from 'next';
import './globals.css';
import { MealPlanProvider } from '@/contexts/MealPlanContext';

export const metadata: Metadata = {
  title: 'Meal Planner',
  description: 'AI-powered weekly meal planning with USDA/BLS price data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MealPlanProvider>
          {children}
        </MealPlanProvider>
      </body>
    </html>
  );
}
