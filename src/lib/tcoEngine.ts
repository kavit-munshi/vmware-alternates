import type { EstateFootprint, PricingAssumptions, TargetPlatform } from '@/types/assessment';
import { TARGETS } from '@/types/assessment';

export interface MigrationCostBreakdown {
  landingZoneFee: number;
  baseVmMigrationLabor: number;
  nsxRemediationFee: number;
  storageMigrationFee: number;
  dbCutoverFee: number;
  bundleCredit: number;
  swingHardwareLease: number;
  total: number;
}
export interface PlatformComparison {
  annualSubscription: number;
  annualManagedServices: number;
  vmwareTotal: number;
  targetTotal: number;
  netSavings: number;
  savingsPct: number;
  steadyStateAnnualSavings: number;
  steadyStateSavingsPct: number;
  breakEvenMonth: number | null;
  migrationCostBreakdown: MigrationCostBreakdown;
}
export interface MonthlyPoint { month: number; vmware: number; Proxmox_Ceph: number; OpenShift_Virt: number; OpenStack_KVM: number; Harvester_Rancher: number }
export interface AnnualPlatformCost { subscriptions: number; migrationLabor: number; swingHardware: number; managedServices: number; total: number; cumulativeNetSavings: number }
export interface AnnualPoint { year: number; vmware: number; cumulativeVmware: number; platforms: Record<TargetPlatform, AnnualPlatformCost> }

const vmwareRate = (estate: EstateFootprint, pricing: PricingAssumptions): number => ({
  VCF: pricing.vcfPerCoreYr,
  VVF: pricing.vvfPerCoreYr,
  vSphere_Enterprise_Plus: pricing.entPlusPerCoreYr,
  vSphere_Standard: pricing.stdPerCoreYr,
})[estate.currentVmwareTier];

export function calculateTcoComparison(estate: EstateFootprint, pricing: PricingAssumptions, horizonYears: 3 | 5) {
  const hosts = Math.max(0, estate.totalHosts);
  const sockets = Math.max(0, estate.socketsPerHost);
  const cores = Math.max(0, estate.physicalCoresPerSocket);
  const actualPhysicalCores = hosts * sockets * cores;
  const billableCoresPerHost = sockets * Math.max(cores, 16);
  const totalBillableCores = hosts * billableCoresPerHost;
  const phantomCores = Math.max(0, totalBillableCores - actualPhysicalCores);
  const annualPhantomCoreWaste = phantomCores * vmwareRate(estate, pricing);
  const totalSockets = hosts * sockets;
  const isVsan = estate.storageType === 'vSAN_OSA' || estate.storageType === 'vSAN_ESA';
  const vsanEntitlementTiB = isVsan ? (estate.currentVmwareTier === 'VCF' ? totalBillableCores : estate.currentVmwareTier === 'VVF' ? Math.ceil(totalBillableCores * 0.25) : 0) : 0;
  const excessVsanTiB = isVsan ? Math.max(0, Math.ceil(estate.rawStorageTiB - vsanEntitlementTiB)) : 0;
  const vmwareCoreAnnual = totalBillableCores * vmwareRate(estate, pricing);
  const vmwareVsanAnnual = excessVsanTiB * pricing.vsanAddonPerTibYr;
  const vmwareNsxAnnual = estate.nsxDeployed === 'NSX_DFW_Microseg' && estate.currentVmwareTier !== 'VCF' ? totalBillableCores * pricing.nsxDfwAddonPerCoreYr : 0;
  const vmwareAnnualBase = vmwareCoreAnnual + vmwareVsanAnnual + vmwareNsxAnnual;
  const annualSubscriptions: Record<TargetPlatform, number> = {
    Proxmox_Ceph: 1150 * totalSockets + 15 * estate.rawStorageTiB,
    OpenShift_Virt: 2700 * Math.ceil(totalSockets / 2) + 25 * estate.rawStorageTiB,
    OpenStack_KVM: pricing.openstackSupportPerHostYr * hosts + pricing.openstackStorageSupportPerTibYr * estate.rawStorageTiB,
    Harvester_Rancher: 1650 * hosts + 15 * estate.rawStorageTiB,
  };
  const landingZoneFee = pricing.baseMigrationEngineeringFee + estate.clusters * 2000;
  const baseVmMigrationLabor = estate.totalVMs * pricing.perVmMigrationRate;
  const nsxRemediationFee = estate.nsxDeployed === 'NSX_DFW_Microseg' ? baseVmMigrationLabor * 0.4 : estate.nsxDeployed === 'NSX_Networking' ? baseVmMigrationLabor * 0.15 : 0;
  const storageMigrationFee = baseVmMigrationLabor * (isVsan ? 0.25 : 0.1);
  const dbCutoverFee = estate.highIopsDbCount * 1500;
  const laborGross = landingZoneFee + baseVmMigrationLabor + nsxRemediationFee + storageMigrationFee + dbCutoverFee;
  const bundleCredit = estate.serviceModel === 'Managed_24x7' ? laborGross * 0.2 : 0;
  const swingHardwareLease = Math.ceil(hosts * 0.15) * 1200 * 2;
  const migrationCostBreakdown: MigrationCostBreakdown = { landingZoneFee, baseVmMigrationLabor, nsxRemediationFee, storageMigrationFee, dbCutoverFee, bundleCredit, swingHardwareLease, total: laborGross - bundleCredit + swingHardwareLease };
  const annualManagedServices = estate.serviceModel === 'Managed_24x7' ? hosts * pricing.managedServicePerHostMonth * 12 : 0;
  const annualVmware = Array.from({ length: 5 }, (_, i) => vmwareAnnualBase * Math.pow(1 + pricing.vmwareAnnualEscalationPct / 100, i));
  const monthlySeries: MonthlyPoint[] = [];
  const cumulativeTargets = Object.fromEntries(TARGETS.map((target) => [target, 0])) as Record<TargetPlatform, number>;
  const breakEven = Object.fromEntries(TARGETS.map((target) => [target, null])) as Record<TargetPlatform, number | null>;
  let cumulativeVmware = 0;
  for (let month = 1; month <= 60; month++) {
    const year = Math.ceil(month / 12) - 1;
    cumulativeVmware += annualVmware[year] / 12;
    for (const target of TARGETS) {
      cumulativeTargets[target] += (annualSubscriptions[target] + annualManagedServices) / 12 + (month <= 4 ? migrationCostBreakdown.total / 4 : 0);
      if (breakEven[target] === null && cumulativeTargets[target] <= cumulativeVmware) breakEven[target] = month;
    }
    monthlySeries.push({ month, vmware: cumulativeVmware, ...cumulativeTargets });
  }
  const annualSchedule: AnnualPoint[] = [];
  let runningVmware = 0;
  const runningTargets = Object.fromEntries(TARGETS.map((target) => [target, 0])) as Record<TargetPlatform, number>;
  for (let i = 0; i < 5; i++) {
    runningVmware += annualVmware[i];
    const platforms = {} as Record<TargetPlatform, AnnualPlatformCost>;
    for (const target of TARGETS) {
      const subscriptions = annualSubscriptions[target];
      const migrationLabor = i === 0 ? laborGross - bundleCredit : 0;
      const swingHardware = i === 0 ? swingHardwareLease : 0;
      const total = subscriptions + annualManagedServices + migrationLabor + swingHardware;
      runningTargets[target] += total;
      platforms[target] = { subscriptions, migrationLabor, swingHardware, managedServices: annualManagedServices, total, cumulativeNetSavings: runningVmware - runningTargets[target] };
    }
    annualSchedule.push({ year: i + 1, vmware: annualVmware[i], cumulativeVmware: runningVmware, platforms });
  }
  const vmwareTotal = annualVmware.slice(0, horizonYears).reduce((a, b) => a + b, 0);
  const platformComparisons = {} as Record<TargetPlatform, PlatformComparison>;
  for (const target of TARGETS) {
    const targetTotal = (annualSubscriptions[target] + annualManagedServices) * horizonYears + migrationCostBreakdown.total;
    const netSavings = vmwareTotal - targetTotal;
    const steadyStateAnnualSavings = vmwareAnnualBase - annualSubscriptions[target] - annualManagedServices;
    platformComparisons[target] = {
      annualSubscription: annualSubscriptions[target], annualManagedServices, vmwareTotal, targetTotal, netSavings,
      savingsPct: vmwareTotal ? netSavings / vmwareTotal * 100 : 0,
      steadyStateAnnualSavings,
      steadyStateSavingsPct: vmwareAnnualBase ? steadyStateAnnualSavings / vmwareAnnualBase * 100 : 0,
      breakEvenMonth: breakEven[target], migrationCostBreakdown,
    };
  }
  const phantomCoreWasteOverHorizon = annualPhantomCoreWaste * annualVmware.slice(0, horizonYears).reduce((sum, year) => sum + (vmwareAnnualBase ? year / vmwareAnnualBase : 0), 0);
  return { actualPhysicalCores, billableCoresPerHost, totalBillableCores, phantomCores, annualPhantomCoreWaste, phantomCoreWasteOverHorizon, vsanEntitlementTiB, excessVsanTiB, vmwareCoreAnnual, vmwareVsanAnnual, vmwareNsxAnnual, vmwareAnnualBase, migrationCostBreakdown, platformComparisons, monthlySeries, annualSchedule };
}
