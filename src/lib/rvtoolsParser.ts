import type { EstateFootprint } from '@/types/assessment';

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const norm = (value: string) => value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const number = (value: string | undefined) => Number((value ?? '').replace(/[^0-9.\-]/g, ''));

export function parseRvtoolsCsv(csv: string): Partial<EstateFootprint> {
  const rows = parseRows(csv);
  if (rows.length < 2) throw new Error('The CSV needs a header and at least one data row.');
  const headers = rows[0].map(norm);
  const find = (...candidates: string[]) => headers.findIndex((header) => candidates.map(norm).includes(header));
  const hostIdx = find('Host', 'Name', 'ESX Host');
  const cpuIdx = find('# CPU', 'CPU', 'CPUs', 'Sockets');
  const coresIdx = find('Cores per CPU', 'CoresPerCPU', 'CPU Cores');
  const memoryIdx = find('# Memory', 'Memory GB', 'Memory', 'Memory MiB');
  const vmsIdx = find('# VMs', 'VMs', 'VM Count');
  const vmIdx = find('VM', 'VM Name');
  if (hostIdx < 0) throw new Error('Missing Host column. Export the RVTools vHost or vInfo tab as CSV.');
  const data = rows.slice(1).filter((row) => row[hostIdx]);
  if (!data.length) throw new Error('No host records were found.');
  const hosts = new Set(data.map((row) => row[hostIdx]));
  const result: Partial<EstateFootprint> = { totalHosts: hosts.size };
  if (cpuIdx >= 0) {
    const values = data.map((row) => number(row[cpuIdx])).filter((n) => n > 0);
    if (values.length) result.socketsPerHost = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
  if (coresIdx >= 0) {
    const values = data.map((row) => number(row[coresIdx])).filter((n) => n > 0);
    if (values.length) result.physicalCoresPerSocket = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
  if (memoryIdx >= 0 && cpuIdx >= 0) {
    const memory = data.reduce((sum, row) => sum + Math.max(0, number(row[memoryIdx]) || 0), 0);
    const inMib = norm(rows[0][memoryIdx]).includes('mib');
    if (memory > 0) result.totalRamGB = Math.round(inMib ? memory / 1024 : memory);
  }
  if (vmsIdx >= 0) result.totalVMs = data.reduce((sum, row) => sum + Math.max(0, number(row[vmsIdx]) || 0), 0);
  else if (vmIdx >= 0) result.totalVMs = data.filter((row) => row[vmIdx]).length;
  return result;
}

export function generateSampleRvtoolsCsv(): string {
  const lines = ['Host,# CPU,Cores per CPU,# Memory,# VMs'];
  for (let i = 1; i <= 24; i++) lines.push(`esx-${String(i).padStart(2, '0')}.example.local,2,12,256,${i <= 12 ? 18 : 17}`);
  return `${lines.join('\r\n')}\r\n`;
}
