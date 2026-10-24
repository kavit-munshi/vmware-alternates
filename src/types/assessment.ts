export type VmwareTier = 'VCF' | 'VVF' | 'vSphere_Enterprise_Plus' | 'vSphere_Standard';
export type TargetPlatform = 'Proxmox_Ceph' | 'OpenShift_Virt' | 'OpenStack_KVM' | 'Harvester_Rancher';
export type StorageType = 'vSAN_OSA' | 'vSAN_ESA' | 'FC_SAN' | 'iSCSI_NFS';
export type NsxTier = 'None' | 'NSX_Networking' | 'NSX_DFW_Microseg';

export interface EstateFootprint {
  companyName: string;
  industry: string;
  currency: 'CAD' | 'USD';
  clusters: number;
  totalHosts: number;
  socketsPerHost: number;
  physicalCoresPerSocket: number;
  totalRamGB: number;
  totalVMs: number;
  rawStorageTiB: number;
  usableStorageTiB: number;
  storageType: StorageType;
  currentVmwareTier: VmwareTier;
  renewalMonthsAway: number;
  nsxDeployed: NsxTier;
  ariaSuiteDeployed: boolean;
  backupTool: 'Veeam' | 'Commvault' | 'Rubrik' | 'Cohesity' | 'Other';
  workloadSplit: { windowsPct: number; linuxPct: number; containersPct: number; legacyOsPct: number };
  highIopsDbCount: number;
  opsTeamFte: number;
  kubernetesMaturity: 'Low' | 'Medium' | 'High';
  serviceModel: 'Managed_24x7' | 'Consulting_Only';
}

export interface PricingAssumptions {
  vcfPerCoreYr: number;
  vvfPerCoreYr: number;
  entPlusPerCoreYr: number;
  stdPerCoreYr: number;
  vsanAddonPerTibYr: number;
  nsxDfwAddonPerCoreYr: number;
  vmwareAnnualEscalationPct: number;
  baseMigrationEngineeringFee: number;
  perVmMigrationRate: number;
  managedServicePerHostMonth: number;
  openstackSupportPerHostYr: number;
  openstackStorageSupportPerTibYr: number;
}

export const TARGETS: TargetPlatform[] = ['Proxmox_Ceph', 'OpenShift_Virt', 'OpenStack_KVM', 'Harvester_Rancher'];
export const TARGET_LABELS: Record<TargetPlatform, string> = {
  Proxmox_Ceph: 'Proxmox VE + Ceph',
  OpenShift_Virt: 'OpenShift Virtualization',
  OpenStack_KVM: 'OpenStack + KVM',
  Harvester_Rancher: 'SUSE Harvester HCI',
};
