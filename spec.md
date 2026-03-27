# Vial Traite Service — Fix Admin Backend Recompilation

## Current State
The backend local code (`main.mo`) already has the correct admin ID `qqb4l-yz3r5-...` as HARDCODED_ADMIN. However, the deployed canister is still running an old compilation that expects `gilph-edmid-...` as admin. This causes `Unauthorized: caller=qqb4l... expected=gilph-edmid-...` errors in the admin section.

The old admin ID (`gilph-edmid-...`) must have NO special privileges — it is treated as a plain user like any other.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Force full backend recompilation so the deployed canister matches local code with `qqb4l-yz3r5-...` as the only HARDCODED_ADMIN
- Remove all forced/hardcoded privileges for `gilph-edmid-...`

### Remove
- All references to `gilph-edmid-...` as admin — it has no special role

## Implementation Plan
1. Regenerate Motoko backend with complete feature set and only `qqb4l-yz3r5-axq5a-4pvuz-2i2ao-6ssuu-tc6rb-ocqyp-asmgd-jsu2l-6qe` as HARDCODED_ADMIN
2. `gilph-edmid-...` is treated as a normal user with no special access
3. Redeploy frontend without changes
