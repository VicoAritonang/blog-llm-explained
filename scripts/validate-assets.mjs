import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'public/assets/lab-v1');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const results=[];
for(const asset of manifest.assets){
  const bytes=await fs.readFile(path.join(dir,asset.file));
  assert.equal(bytes.length,asset.bytes,`${asset.id}: byte size`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`${asset.id}: hash`);
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:asset.file,maxIssues:1000});
  const array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const imported=await new GLTFLoader().parseAsync(array,'');
  let meshCount=0,triangles=0,socketCount=0;
  imported.scene.traverse(o=>{if(o.userData.socket)socketCount++;if(!o.isMesh)return;meshCount++;
    const pos=o.geometry.attributes.position,norm=o.geometry.attributes.normal;
    assert.ok(pos&&norm,`${asset.id}: position + normals`);
    for(const attr of [pos,norm])for(const x of attr.array)assert.ok(Number.isFinite(x),`${asset.id}: finite geometry`);
    triangles+=(o.geometry.index?.count??pos.count)/3;
  });
  assert.equal(meshCount,asset.meshNodes,`${asset.id}: imported mesh count`);
  assert.equal(triangles,asset.triangles,`${asset.id}: imported triangles`);
  assert.equal(socketCount,asset.sockets.length,`${asset.id}: imported sockets`);
  const bounds=new T.Box3().setFromObject(imported.scene);
  for(const side of ['min','max'])bounds[side].toArray().forEach((n,i)=>assert.ok(Math.abs(n-asset.bounds[side][i])<1e-4,`${asset.id}: bounds`));
  results.push({id:asset.id,errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos,
    imported:true,triangles,meshCount,socketCount,messages:report.issues.messages});
}
const summary={validator:validator.version(),assetCount:results.length,errors:results.reduce((s,r)=>s+r.errors,0),
  warnings:results.reduce((s,r)=>s+r.warnings,0),totalBytes:manifest.assets.reduce((s,a)=>s+a.bytes,0),results};
await fs.mkdir(path.join(root,'docs'),{recursive:true});
await fs.writeFile(path.join(root,'docs/asset-validation.json'),JSON.stringify(summary,null,2)+'\n');
const lines=['# Asset validation','',`Validated ${results.length} GLB files using Khronos glTF Validator ${summary.validator} and Three.js GLTFLoader.`,
  '',`Errors: **${summary.errors}**. Warnings: **${summary.warnings}**. GLB total: **${(summary.totalBytes/1024/1024).toFixed(2)} MiB**.`,
  '', 'Every asset passes byte-size and SHA-256 checks, import round-trip, mesh/triangle/socket counts, finite positions/normals, and bounding-box comparison.',
  '', '| Asset | Triangles | Mesh nodes | Errors | Warnings |','|---|---:|---:|---:|---:|',
  ...results.map(r=>`| ${r.id} | ${r.triangles} | ${r.meshCount} | ${r.errors} | ${r.warnings} |`),
  '', 'This report checks asset integrity. It does not establish production FPS, accessibility compliance, or completion of the learning simulator. Visual review is recorded separately in visual-review.md.',''];
await fs.writeFile(path.join(root,'docs/asset-validation.md'),lines.join('\n'));
console.log(JSON.stringify({assetCount:summary.assetCount,errors:summary.errors,warnings:summary.warnings,totalBytes:summary.totalBytes},null,2));
if(summary.errors||summary.warnings)process.exitCode=1;
