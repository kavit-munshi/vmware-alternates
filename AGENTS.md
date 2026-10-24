# VMware Exit Advisor architecture

- Next.js App Router pages live in `src/app`; reusable UI lives in `src/components`; deterministic business logic lives in `src/lib`; canonical interfaces are in `src/types`; the Zustand store is in `src/store`.
- All interactive components must begin with `'use client';`. Keep financial and recommendation calculations pure and deterministic so every route uses the same numbers.
- The persisted assessment uses `sessionStorage`, stays in this browser tab, and contains no server-side customer record. Do not introduce remote transmission of imported RVTools data without an explicit product requirement.
- The production build is a static export in `.next-static/`. Deploy that directory to a static host or CDN. `npm start` serves the export locally. Use Node 20 or 22 LTS for builds; Node 23.2 has a known Webpack JSON parsing regression.
- Broadcom licensing guidance for VCF/VVF counts at least 16 physical cores per CPU socket. Billable cores are hosts × sockets per host × max(physical cores per socket, 16). VCF includes 1 TiB of vSAN raw capacity per purchased core; VVF includes 0.25 TiB per purchased core. Excess raw vSAN TiB needs an add-on. These rules are from Broadcom KB 313548: https://knowledge.broadcom.com/external/article?articleNumber=313548 . Street prices and alternative platform rates in this app are editable illustrative assumptions, not vendor quotes.
- Keep workload percentages at 100 and guard user-entered quantities from negative or non-finite values. CSV parsing is client-side.
- Before completing changes, run `npx tsc --noEmit`, `npm run lint`, and `npm run build`; all must pass.
