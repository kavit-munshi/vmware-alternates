# Exit Architecture

A browser-based VMware exit assessment for consulting and managed services teams. It turns an estate inventory into a comparative TCO model, a four-phase migration blueprint, and a printable executive report.

## Run locally

Use Node 20 or 22 LTS and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The assessment is saved in this tab's `sessionStorage` and is not sent to a server.

## Verify and deploy

```bash
npm run test
npx tsc --noEmit
npm run lint
npm run build
npm start
```

The build writes a static export to `.next-static/`. Deploy that directory to a static host or CDN, or use `npm start` to serve it locally. No Next.js production server is required. The app is deliberately kept on React 18 and Next.js 14 to match the requested stack; Next.js 14 is outside its current support window, so use the static export and plan an App Router/React 19 framework upgrade before introducing server features.

## Model notes

- VMware core licensing uses `hosts × sockets × max(physical cores per socket, 16)`; VCF includes 1 TiB raw vSAN per billable core and VVF includes 0.25 TiB. Excess capacity is charged using the editable add-on rate. [Broadcom KB 313548](https://knowledge.broadcom.com/external/article?articleNumber=313548) describes the core and vSAN rules.
- Platform subscription rates, VMware street prices, migration labor, and managed service fees are illustrative assumptions in the selected reporting currency. Switching CAD/USD changes the label and does not convert prices.
- The OpenStack + KVM line models an optional support and tooling allowance of 950 per host and 12 per raw storage TiB per year. OpenStack itself has no required software license fee.
- Year 1 includes full one-time migration costs. The 60-month chart allocates the upfront spend over months 1–4 and reports the first cumulative cost crossover.
- RVTools vHost or vInfo CSV imports happen entirely in the browser. The sample CSV is available from the assessment page.
- Rolling migration reduces disruption, but a guest cutover may still require a short interruption. The blueprint calls for application-specific RTO/RPO, restore proof, and rollback acceptance.
