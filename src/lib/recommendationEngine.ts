import type { EstateFootprint, TargetPlatform } from '@/types/assessment';
import { TARGETS, TARGET_LABELS } from '@/types/assessment';
import type { calculateTcoComparison } from '@/lib/tcoEngine';

export interface PlatformFit { target: TargetPlatform; score: number; pros: string[]; considerations: string[]; licensing: string; rationale: string }
export interface StackMapping { layer: string; source: string; target: string; validation: string }
export interface MigrationPhase { name: string; startWeek: number; endWeek: number; durationWeeks: number; activities: string[]; exitGate: string }
export interface RiskItem { area: string; severity: 'High' | 'Medium'; risk: string; mitigation: string }

export function generateMigrationBlueprint(estate: EstateFootprint, tco: ReturnType<typeof calculateTcoComparison>, selectedTarget?: TargetPlatform) {
  const w = estate.workloadSplit;
  const vsan = estate.storageType.startsWith('vSAN');
  const fitScores: PlatformFit[] = TARGETS.map((target) => {
    let score = 64;
    const pros: string[] = [];
    const considerations: string[] = [];
    let licensing = '';
    if (target === 'Proxmox_Ceph') {
      score += Math.round(w.windowsPct * 0.1) + (vsan ? 11 : 3) + (estate.opsTeamFte < 8 ? 7 : 2) - Math.round(w.containersPct * 0.14);
      pros.push('Mature VM operations with integrated Ceph and a familiar cluster model', 'Low modeled socket based subscription');
      considerations.push('Plan Ceph failure domains and dedicated storage networking');
      licensing = 'Support subscription per CPU socket plus modeled storage support';
    } else if (target === 'OpenShift_Virt') {
      score += Math.round(w.containersPct * 0.25) + (estate.kubernetesMaturity === 'High' ? 16 : estate.kubernetesMaturity === 'Medium' ? 5 : -13) + (estate.opsTeamFte >= 8 ? 6 : -7) - Math.round(w.legacyOsPct * 0.2);
      pros.push('VMs and containers on a shared Kubernetes control plane', 'Strong GitOps and policy automation path');
      considerations.push('Operator enablement and workload compatibility testing are material');
      licensing = 'Modeled two socket pair subscription plus storage support';
    } else if (target === 'OpenStack_KVM') {
      score += (estate.totalHosts >= 48 ? 15 : -4) + (estate.opsTeamFte >= 8 ? 10 : -11) + Math.round(w.linuxPct * 0.08) - (vsan ? 3 : 0);
      pros.push('Open multi tenant IaaS control plane over KVM', 'Nova, Neutron and Cinder allow flexible compute, network and storage design');
      considerations.push('Dedicated cloud operations capacity and control plane lifecycle management are required');
      licensing = 'No required OpenStack license; modeled support and tooling allowance per host and storage TiB';
    } else {
      score += (vsan ? 13 : 3) + (estate.totalHosts <= 48 ? 8 : -5) + Math.round(w.containersPct * 0.12) - (estate.storageType === 'FC_SAN' ? 12 : 0);
      pros.push('Integrated HCI operations with Rancher ecosystem', 'Good fit for compact distributed clusters');
      considerations.push('Validate Longhorn performance and platform feature parity for tier one VMs');
      licensing = 'Modeled enterprise support per host plus storage support';
    }
    score = Math.max(0, Math.min(100, score));
    const cost = tco.platformComparisons[target];
    const rationale = `${TARGET_LABELS[target]} scores ${score}/100 for ${estate.totalHosts} hosts, ${w.containersPct}% containers and ${estate.kubernetesMaturity.toLowerCase()} Kubernetes maturity. Modeled ${cost.netSavings >= 0 ? 'savings' : 'added cost'} over the chosen horizon: ${Math.abs(cost.savingsPct).toFixed(1)}%.`;
    return { target, score, pros, considerations, licensing, rationale };
  }).sort((a, b) => b.score - a.score);

  const recommendedTarget = fitScores[0].target;
  const target = selectedTarget ?? recommendedTarget;
  const stack: Record<TargetPlatform, { hypervisor: string; control: string; storage: string; network: string; automation: string }> = {
    Proxmox_Ceph: { hypervisor: 'KVM / QEMU on Proxmox VE', control: 'Proxmox cluster UI / API', storage: vsan ? 'Ceph RBD / BlueStore' : estate.storageType === 'FC_SAN' ? 'Multipath FC with LVM or Ceph after validation' : 'NFS/iSCSI or Ceph RBD', network: 'Proxmox SDN, OVS and host firewall', automation: 'Terraform/OpenTofu, Ansible, Prometheus and Grafana' },
    OpenShift_Virt: { hypervisor: 'KubeVirt / KVM on OpenShift', control: 'OpenShift API, GitOps and ACM', storage: vsan ? 'ODF/Ceph CSI or validated external CSI' : 'Validated CSI for existing SAN/NFS', network: 'OVN-Kubernetes, NetworkPolicy and Cilium where supported', automation: 'OpenShift GitOps, Ansible, OpenTelemetry and monitoring' },
    OpenStack_KVM: { hypervisor: 'Nova compute with libvirt / KVM', control: 'OpenStack Keystone, Nova API and Horizon', storage: vsan ? 'Cinder volumes on Ceph RBD' : 'Cinder with validated FC/NFS/iSCSI backend', network: 'Neutron with OVN and security groups', automation: 'OpenStack API, Terraform/OpenTofu, Ansible and Prometheus' },
    Harvester_Rancher: { hypervisor: 'KubeVirt / KVM on Harvester', control: 'Harvester UI with Rancher fleet management', storage: 'Longhorn distributed block storage', network: 'Harvester VLAN networks and Kubernetes policy', automation: 'Rancher Fleet, Terraform/OpenTofu, Ansible and monitoring' },
  };
  const selected = stack[target];
  const stackMapping: StackMapping[] = [
    { layer: 'Hypervisor', source: `${estate.totalHosts} ESXi hosts / ${estate.currentVmwareTier}`, target: selected.hypervisor, validation: 'CPU flags, firmware, guest drivers and boot mode' },
    { layer: 'Control plane', source: `${estate.clusters} vCenter managed clusters`, target: selected.control, validation: 'RBAC, HA policy, API inventory and templates' },
    { layer: 'Storage layer', source: `${estate.storageType.replaceAll('_', ' ')} · ${estate.rawStorageTiB} raw TiB`, target: selected.storage, validation: 'Capacity, IOPS, failure domains and restore testing' },
    { layer: 'SDN / microsegmentation', source: estate.nsxDeployed === 'None' ? 'vSphere distributed switching' : estate.nsxDeployed.replaceAll('_', ' '), target: selected.network, validation: 'Translate every policy and test east-west deny rules' },
    { layer: 'Backup integration', source: estate.backupTool, target: `${estate.backupTool} compatibility validation plus native snapshots and isolated restore`, validation: 'Application consistent restore and immutable copy' },
    { layer: 'Day-2 IaC / observability', source: estate.ariaSuiteDeployed ? 'Aria Suite / vRealize' : 'Existing monitoring and runbooks', target: selected.automation, validation: 'Alerts, patching, capacity and audit evidence' },
  ];
  const weeksDiscovery = estate.totalHosts >= 48 ? 4 : 2;
  const weeksFoundation = vsan || estate.nsxDeployed !== 'None' ? 5 : 3;
  const weeksWaves = Math.max(3, Math.ceil(estate.totalVMs / 70));
  const weeksClosure = estate.totalHosts >= 48 ? 3 : 2;
  let cursor = 1;
  const phase = (name: string, durationWeeks: number, activities: string[], exitGate: string): MigrationPhase => {
    const item = { name, startWeek: cursor, endWeek: cursor + durationWeeks - 1, durationWeeks, activities, exitGate };
    cursor += durationWeeks;
    return item;
  };
  const phases = [
    phase('1 · Discover & prove', weeksDiscovery, [`Inventory ${estate.totalVMs} VMs and dependency groups`, 'Benchmark tier one apps, restore points and migration windows', 'Build pilot acceptance and rollback criteria'], 'Signed app dependency map and pilot success criteria'),
    phase('2 · Land & bridge', weeksFoundation, [`Lease ${Math.ceil(estate.totalHosts * 0.15)} swing hosts for two months`, `Deploy ${TARGET_LABELS[target]} landing zone with IaC`, 'Establish storage, network, backup and observability parity'], 'Pilot failover and restore rehearsal approved'),
    phase('3 · Warm copy & rolling waves', weeksWaves, ['Warm copy VM disks with virt-v2v and replication where supported', 'Drain ESXi hosts by cluster; PXE/Ansible convert eligible hardware', `Rehearse ${estate.highIopsDbCount} high IOPS database cutovers`, 'Validate each wave and retain rollback snapshots'], 'Each application owner signs off before source removal'),
    phase('4 · Close & operate', weeksClosure, ['Run resilience and disaster recovery exercises', 'Transfer runbooks to operations and 24x7 monitoring where contracted', 'Decommission vCenter, NSX and Aria after retention gates'], 'Financial and technical sign-off; renewal cancellation confirmed'),
  ];
  const risks: RiskItem[] = [];
  if (w.windowsPct > 0) risks.push({ area: 'Windows guests', severity: w.windowsPct >= 40 ? 'High' : 'Medium', risk: `${w.windowsPct}% Windows workload mix may need VirtIO driver injection and activation review.`, mitigation: 'Pre-inject signed VirtIO drivers, test boot and licensing, retain rollback snapshots.' });
  if (estate.nsxDeployed !== 'None') risks.push({ area: 'Network policy', severity: estate.nsxDeployed === 'NSX_DFW_Microseg' ? 'High' : 'Medium', risk: `${estate.nsxDeployed.replaceAll('_', ' ')} rules may not map one for one.`, mitigation: `Export flows and translate to ${selected.network}; replay allow and deny tests before each wave.` });
  if (vsan) risks.push({ area: 'Storage evacuation', severity: 'High', risk: `${estate.rawStorageTiB} raw TiB ${estate.storageType.replaceAll('_', ' ')} must be evacuated without losing protection.`, mitigation: 'Size failure domains, reserve bridge capacity, verify Ceph/target storage performance and checksum each copy.' });
  if (estate.storageType === 'FC_SAN') risks.push({ area: 'Fibre Channel', severity: 'High', risk: 'FC SAN LUN ownership and multipath behavior may differ on KVM.', mitigation: 'Design WWPN zoning, device mapper multipath and LVM layout; test path loss and recovery.' });
  if (estate.highIopsDbCount > 0) risks.push({ area: 'Databases', severity: 'High', risk: `${estate.highIopsDbCount} high IOPS databases need consistent cutover and latency proof.`, mitigation: 'Benchmark IOPS and p99 latency, use native database replication where possible, rehearse failback.' });
  if (w.legacyOsPct > 0) risks.push({ area: 'Legacy OS', severity: 'Medium', risk: `${w.legacyOsPct}% legacy guests may lack supported drivers.`, mitigation: 'Inventory OS versions, run isolated pilot conversion and retain source host capacity until acceptance.' });
  risks.push({ area: 'Availability claim', severity: 'Medium', risk: 'Guest cutover can require a short interruption even with warm block copy.', mitigation: 'Agree per application RTO/RPO, replicate data, schedule final sync and prove rollback before cutover.' });
  return { fitScores, recommendedTarget, stackMapping, phases, totalWeeks: cursor - 1, risks };
}
