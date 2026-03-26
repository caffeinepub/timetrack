# Vial Traite Service

## Current State
The admin user accidentally deactivated their own account via the Profil section, changing their backend role from `#admin` to `#guest` via `assignCallerUserRole`.

## Requested Changes (Diff)

### Add
- Hardcoded admin protection in `access-control.mo`: `isHardcodedAdmin()` check that always returns `#admin` role for the hardcoded principal ID, regardless of stored role
- `initializeAccessControl()` call in `Profil.tsx` on load to re-register admin role

### Modify
- `getUserRole()`: returns `#admin` for hardcoded admin principal before checking the map
- `initialize()`: always sets hardcoded admin to `#admin` role
- `assignRole()`: silently ignores role changes targeting the hardcoded admin principal

### Remove
- Nothing removed

## Implementation Plan
1. Fix `access-control.mo` to protect hardcoded admin from role changes
2. Add `initializeAccessControl()` call in `Profil.tsx` load to restore admin role on next access
