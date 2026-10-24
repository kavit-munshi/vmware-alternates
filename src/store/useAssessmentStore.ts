'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EstateFootprint, PricingAssumptions, TargetPlatform } from '@/types/assessment';

export const defaultEstate: EstateFootprint = {
  companyName: 'Northstar Manufacturing', industry: 'Manufacturing', currency: 'CAD',
  clusters: 4, totalHosts: 24, socketsPerHost: 2, physicalCoresPerSocket: 12,
  totalRamGB: 6144, totalVMs: 420, rawStorageTiB: 180, usableStorageTiB: 105,
  storageType: 'vSAN_OSA', currentVmwareTier: 'VCF', renewalMonthsAway: 6,
  nsxDeployed: 'NSX_DFW_Microseg', ariaSuiteDeployed: true, backupTool: 'Veeam',
  workloadSplit: { windowsPct: 55, linuxPct: 30, containersPct: 10, legacyOsPct: 5 },
  highIopsDbCount: 12, opsTeamFte: 5, kubernetesMaturity: 'Medium', serviceModel: 'Managed_24x7',
};

export const defaultPricing: PricingAssumptions = {
  vcfPerCoreYr: 350, vvfPerCoreYr: 190, entPlusPerCoreYr: 110, stdPerCoreYr: 65,
  vsanAddonPerTibYr: 210, nsxDfwAddonPerCoreYr: 95, vmwareAnnualEscalationPct: 7,
  baseMigrationEngineeringFee: 25000, perVmMigrationRate: 125,
  managedServicePerHostMonth: 450,
  openstackSupportPerHostYr: 950, openstackStorageSupportPerTibYr: 12,
};

const presets: Record<'mid_market' | 'large_enterprise' | 'hci_heavy', EstateFootprint> = {
  mid_market: defaultEstate,
  large_enterprise: { ...defaultEstate, companyName: 'Meridian Global', industry: 'Financial services', clusters: 12, totalHosts: 96, physicalCoresPerSocket: 24, totalRamGB: 36864, totalVMs: 2200, rawStorageTiB: 960, usableStorageTiB: 560, highIopsDbCount: 58, opsTeamFte: 18, kubernetesMaturity: 'High', workloadSplit: { windowsPct: 45, linuxPct: 30, containersPct: 20, legacyOsPct: 5 } },
  hci_heavy: { ...defaultEstate, companyName: 'Summit Health Network', industry: 'Healthcare', clusters: 7, totalHosts: 42, physicalCoresPerSocket: 16, totalRamGB: 14336, totalVMs: 860, rawStorageTiB: 720, usableStorageTiB: 405, storageType: 'vSAN_ESA', currentVmwareTier: 'VVF', highIopsDbCount: 34, opsTeamFte: 8, renewalMonthsAway: 4 },
};

interface AssessmentState {
  estate: EstateFootprint;
  pricing: PricingAssumptions;
  selectedTarget: TargetPlatform;
  horizonYears: 3 | 5;
  updateEstate: (patch: Partial<EstateFootprint>) => void;
  updatePricing: (patch: Partial<PricingAssumptions>) => void;
  setSelectedTarget: (target: TargetPlatform) => void;
  setHorizonYears: (years: 3 | 5) => void;
  loadPreset: (preset: keyof typeof presets) => void;
}

export function migrateAssessmentState(persistedState: unknown): unknown {
  const state = persistedState as Record<string, unknown>;
  return {
    ...state,
    pricing: { ...defaultPricing, ...(state.pricing as Partial<PricingAssumptions> | undefined) },
    selectedTarget: state.selectedTarget === 'CloudStack_KVM' ? 'OpenStack_KVM' : state.selectedTarget,
  };
}

export const useAssessmentStore = create<AssessmentState>()(persist((set) => ({
  estate: defaultEstate,
  pricing: defaultPricing,
  selectedTarget: 'Proxmox_Ceph',
  horizonYears: 5,
  updateEstate: (patch) => set((state) => ({ estate: { ...state.estate, ...patch } })),
  updatePricing: (patch) => set((state) => ({ pricing: { ...state.pricing, ...patch } })),
  setSelectedTarget: (selectedTarget) => set({ selectedTarget }),
  setHorizonYears: (horizonYears) => set({ horizonYears }),
  loadPreset: (preset) => set({ estate: { ...presets[preset], workloadSplit: { ...presets[preset].workloadSplit } } }),
}), {
  name: 'vmware-exit-assessment-v1',
  version: 2,
  migrate: migrateAssessmentState,
  storage: createJSONStorage(() => sessionStorage),
  skipHydration: true,
}));
