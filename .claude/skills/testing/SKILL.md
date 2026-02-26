# Testing Skill - GymGurus

## Testing Conventions

- Always use dedicated test accounts, never production data
- Test all 3 roles: Ronin (solo), Sensei (trainer), Shihan (admin)
- Check browser console after every navigation and form submission
- Test edge cases: empty inputs, very long strings, special characters
- Verify mobile responsiveness at 375px, 768px, and 1024px widths

## Common Test Flows

1. Auth Flow: Register - Login - Session persistence - Logout
2. Workout Flow: Browse exercises - Create workout - Execute workout - View history
3. Measurement Flow: Log weight - Log body measurements - View progress chart
4. AI Flow: Open chat - Ask for workout advice - Verify context-awareness
5. Profile Flow: Edit profile - Change settings - Verify persistence

## Known Issues to Verify

- Google Fonts blocked by CSP (check if Playfair Display renders)
- Web vitals endpoint returns 403
- Mobile meta tag deprecation warning
