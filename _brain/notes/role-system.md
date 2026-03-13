# Role System

## Three Roles

| DB Value  | Display Name | Login Route                 | Accent Colour    |
| --------- | ------------ | --------------------------- | ---------------- |
| `trainer` | **Guru**     | `/auth/login` (role: Guru)  | Gold `#c9a84c`   |
| `solo`    | **Ronin**    | `/auth/login` (role: Ronin) | Purple `#a855f7` |
| `client`  | **Disciple** | `/disciple-login`           | Teal `#0d9488`   |

**Rule**: Always use display names in UI. Never show raw DB values (`trainer`, `solo`, `client`).

## Display Name Helpers — `client/src/lib/roles.ts`

- `getRoleDisplayName(role: InternalRole)` → "Guru" / "Ronin" / "Disciple"
- `getPlanDisplayName(planId: string)` → "Free Trial" / "Ronin" / "Ronin AI" / "Guru" / "Pro Guru"

## Plan IDs → Display Names

| DB / Stripe ID | Display    |
| -------------- | ---------- |
| `FreeTrial`    | Free Trial |
| `Solo`         | Ronin      |
| `Solo_ai`      | Ronin AI   |
| `Guru`         | Guru       |
| `ProGuru`      | Pro Guru   |

**Never** show raw plan IDs to users (§VA-4 in CLAUDE.md).

## CSS Role Colours

Colours live as CSS custom properties on `<html>`:

```css
.role-guru {
  --primary: #c9a84c;
}
.role-ronin {
  --primary: #a855f7;
}
.role-disciple {
  --primary: #0d9488;
}
```

**Critical rule**: Use `bg-primary` / `text-primary` — **never hardcode colours** on role-specific components. `bg-primary` inherits the correct role colour automatically.

Previously broke this with hardcoded `bg-[#c9a84c]` on action buttons — reverted in commit `17b7ff2`.

## Role Flash Prevention

See [[auth-system]] — `gg_role` localStorage key + blocking script in index.html ensures role class is on `<html>` before first paint.

## Related Notes

- [[auth-system]]
- [[gotchas]]
