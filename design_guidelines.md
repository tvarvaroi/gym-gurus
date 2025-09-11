# Gym Gurus Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from **fitness and productivity applications** like MyFitnessPal, Strava, and Notion. This fitness management platform requires a balance of motivational energy and professional functionality for personal trainers.

## Core Design Elements

### Color Palette
**Primary Colors (Dark Mode)**:
- Background: 15 15% 9% (Deep charcoal)
- Surface: 15 12% 15% (Elevated dark gray)
- Primary: 140 85% 45% (Energetic green - fitness/health association)
- Text: 0 0% 95% (Near white)

**Primary Colors (Light Mode)**:
- Background: 0 0% 98% (Clean white)
- Surface: 0 0% 95% (Light gray)
- Primary: 140 85% 35% (Deeper green for contrast)
- Text: 0 0% 15% (Dark charcoal)

**Accent Colors**:
- Success: 120 65% 45% (Achievement green)
- Warning: 35 85% 55% (Progress orange)
- Error: 0 75% 55% (Alert red)

### Typography
- **Primary Font**: Inter (Google Fonts) - Clean, modern, highly legible
- **Display Font**: Outfit (Google Fonts) - Bold headers and CTAs
- **Scale**: Text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px), text-3xl (30px)

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, m-2 (cards, buttons)
- Standard spacing: p-4, m-4 (sections, components)
- Generous spacing: p-8, m-8 (page sections)
- Large spacing: p-12, p-16 (hero sections, major breaks)

### Component Library

**Navigation**:
- Clean sidebar navigation with fitness icons
- Top navigation bar with trainer profile and notifications
- Breadcrumb navigation for deep sections

**Data Display**:
- Progress charts using vibrant gradients (green to blue)
- Client cards with profile photos and key metrics
- Workout cards with exercise thumbnails
- Calendar components with color-coded sessions

**Forms**:
- Rounded input fields with subtle shadows
- Toggle switches for binary options
- Multi-step forms for workout creation
- File upload areas for progress photos

**Overlays**:
- Modal dialogs for quick actions
- Slide-out panels for detailed views
- Toast notifications for feedback

### Visual Treatment
**Gradients**: Subtle linear gradients from primary green to deeper teal for hero sections and key CTAs. Use sparingly for maximum impact.

**Background Treatments**: Clean, minimal backgrounds with occasional subtle geometric patterns in very low opacity for section breaks.

## Images
**Hero Image**: Large motivational fitness image showing diverse people exercising - positioned in the main dashboard header to inspire and reinforce the fitness focus.

**Component Images**: 
- Exercise demonstration thumbnails in workout cards
- Client progress photos in comparison views  
- Trainer profile photos in navigation
- Icon illustrations for empty states and onboarding

**Image Treatment**: All images should have subtle rounded corners (rounded-lg) and gentle shadows for depth while maintaining the clean, professional aesthetic.