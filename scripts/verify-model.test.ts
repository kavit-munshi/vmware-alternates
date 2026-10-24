import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultEstate, defaultPricing, migrateAssessmentState } from '../src/store/useAssessmentStore';
import { calculateTcoComparison } from '../src/lib/tcoEngine';
import { generateMigrationBlueprint } from '../src/lib/recommendationEngine';
import { generateSampleRvtoolsCsv, parseRvtoolsCsv } from '../src/lib/rvtoolsParser';

test('16-core floor and full migration investment are reflected in five-year cash flow', () => {
  const tco = calculateTcoComparison(defaultEstate, defaultPricing, 5);
  assert.equal(tco.actualPhysicalCores, 576);
  assert.equal(tco.totalBillableCores, 768);
  assert.equal(tco.phantomCores, 192);
  assert.equal(tco.annualPhantomCoreWaste, 67200);
  assert.equal(tco.vsanEntitlementTiB, 768);
  assert.equal(tco.migrationCostBreakdown.total, 119700);
  assert.equal(tco.monthlySeries.length, 60);
  assert.equal(tco.annualSchedule.length, 5);
  assert.ok(Math.abs(tco.monthlySeries[59].vmware - tco.platformComparisons.Proxmox_Ceph.vmwareTotal) < 0.01);
  assert.ok(Math.abs(tco.monthlySeries[59].Proxmox_Ceph - tco.platformComparisons.Proxmox_Ceph.targetTotal) < 0.01);
  const firstCrossover = tco.monthlySeries.find((point) => point.Proxmox_Ceph <= point.vmware)?.month ?? null;
  assert.equal(tco.platformComparisons.Proxmox_Ceph.breakEvenMonth, firstCrossover);
});

test('VVF entitlement, NSX add-on and consulting fee behavior', () => {
  const estate = { ...defaultEstate, currentVmwareTier: 'VVF' as const, rawStorageTiB: 300, serviceModel: 'Consulting_Only' as const };
  const tco = calculateTcoComparison(estate, defaultPricing, 3);
  assert.equal(tco.vsanEntitlementTiB, 192);
  assert.equal(tco.excessVsanTiB, 108);
  assert.equal(tco.vmwareNsxAnnual, 768 * defaultPricing.nsxDfwAddonPerCoreYr);
  assert.equal(tco.migrationCostBreakdown.bundleCredit, 0);
  assert.equal(tco.platformComparisons.OpenShift_Virt.annualManagedServices, 0);
  assert.equal(tco.annualSchedule[0].platforms.OpenShift_Virt.migrationLabor + tco.annualSchedule[0].platforms.OpenShift_Virt.swingHardware, tco.migrationCostBreakdown.total);
});

test('RVTools sample imports and recommendation retains top fit when viewing another target', () => {
  const patch = parseRvtoolsCsv(generateSampleRvtoolsCsv());
  assert.equal(patch.totalHosts, 24);
  assert.equal(patch.totalVMs, 420);
  assert.equal(patch.physicalCoresPerSocket, 12);
  const tco = calculateTcoComparison(defaultEstate, defaultPricing, 5);
  const blueprint = generateMigrationBlueprint(defaultEstate, tco, 'OpenStack_KVM');
  assert.equal(blueprint.recommendedTarget, blueprint.fitScores[0].target);
  assert.match(blueprint.stackMapping[0].target, /KVM/);
  assert.match(blueprint.stackMapping[1].target, /OpenStack/);
  assert.ok(blueprint.risks.some((risk) => risk.area === 'Network policy'));
  assert.equal(tco.platformComparisons.OpenStack_KVM.annualSubscription, 950 * 24 + 12 * 180);
});

test('saved CloudStack selection migrates to OpenStack without losing custom pricing', () => {
  const saved = { selectedTarget: 'CloudStack_KVM', pricing: { vcfPerCoreYr: 410 } };
  const migrated = migrateAssessmentState(saved) as { selectedTarget: string; pricing: typeof defaultPricing };
  assert.equal(migrated.selectedTarget, 'OpenStack_KVM');
  assert.equal(migrated.pricing.vcfPerCoreYr, 410);
  assert.equal(migrated.pricing.openstackSupportPerHostYr, 950);
});
