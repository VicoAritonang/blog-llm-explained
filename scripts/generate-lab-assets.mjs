import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original texture-free geometry. Animation and numerical labels belong to the app.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(v => { this.result = `data:${blob.type};base64,${Buffer.from(v).toString('base64')}`; this.onloadend?.(); }); }
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/assets/lab-v1');
await fs.mkdir(out, { recursive: true });
const palette = { ceramic:'#cbd5dd', white:'#e5ebef', graphite:'#142331', steel:'#516676', screen:'#07131f',
  cyan:'#42d7ec', violet:'#aa8df5', amber:'#ffbe63', green:'#69d9b1', red:'#e77e82', blue:'#5b8ae0', floor:'#253746' };
const mats = Object.fromEntries(Object.entries(palette).map(([name,color]) => [name,new T.MeshStandardMaterial({
  name, color, metalness:['steel','graphite'].includes(name)?.55:.12, roughness:.52,
  emissive:['cyan','violet','amber','green','blue'].includes(name)?color:'#000000',
  emissiveIntensity:['cyan','violet','amber','green','blue'].includes(name)?.28:1
})]));
const geometries = new Map();
function cached(key,create) { if(!geometries.has(key)) { const geo=create(); geo.deleteAttribute('uv'); geometries.set(key,geo); } return geometries.get(key); }
function group(name) { const g=new T.Group();g.name=name;return g; }
function mesh(g,name,geo,mat,p=[0,0,0],r=[0,0,0]) { geo.deleteAttribute('uv');const m=new T.Mesh(geo,mats[mat]);m.name=name;m.position.set(...p);m.rotation.set(...r);g.add(m);return m; }
function box(g,name,s,p,mat='graphite',bevel=false) {
  return mesh(g,name,cached(`box-${s}-${bevel}`,()=>bevel?new RoundedBoxGeometry(...s,1,Math.min(...s)*.14):new T.BoxGeometry(...s)),mat,p);
}
function cyl(g,name,r,h,p,mat='steel',segments=20) {return mesh(g,name,cached(`cyl-${r}-${h}-${segments}`,()=>new T.CylinderGeometry(r,r,h,segments)),mat,p);}
function sphere(g,name,r,p,mat='cyan') {return mesh(g,name,cached(`sphere-${r}`,()=>new T.IcosahedronGeometry(r,1)),mat,p);}
function torus(g,name,r,t,p,mat='cyan',rot=[Math.PI/2,0,0]) {return mesh(g,name,cached(`torus-${r}-${t}`,()=>new T.TorusGeometry(r,t,6,40)),mat,p,rot);}
function socket(g,name,p,role) {const s=group(`socket_${name}`);s.position.set(...p);s.userData={socket:true,role};g.add(s);return s;}
function pipe(g,name,points,mat='cyan',r=.055) {
  const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
  return mesh(g,name,new T.TubeGeometry(c,32,r,6,false),mat);
}
function pedestal(g,w=4.8,d=3.2) {
  box(g,'base',[w,.22,d],[0,.11,0],'graphite',true);box(g,'inlay',[w-.3,.07,d-.3],[0,.25,0],'steel',true);
  box(g,'status_strip',[w-.65,.035,.04],[0,.3,d/2-.1],'cyan');
}
function panel(g,name,p,w=2.4,h=2,accent='cyan') {
  const f=group(name);f.position.set(...p);g.add(f);
  box(f,'frame',[w+.18,h+.18,.18],[0,h/2,0],'ceramic',true);box(f,'display',[w,h,.035],[0,h/2,.105],'screen');
  box(f,'status',[w-.12,.025,.025],[0,h+.015,.125],accent);socket(f,'display',[0,h/2,.14],'runtime-data-surface');return f;
}
function grid(g,name,rows,cols,w,h,accent,p=[0,0,0],mask=false) {
  const a=group(name);a.position.set(...p);g.add(a);
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
    const masked=mask&&j>i;const c=box(a,`cell_r${i}_c${j}`,[w/cols*.84,h/rows*.79,.025],[(j+.5)*w/cols-w/2,h-(i+.5)*h/rows,.02],masked?'steel':accent);
    c.userData={row:i,column:j,illustrative:true,masked};
  }return a;
}
const defs=[];
function asset(id,category,description,build,dynamicNodes=[]) {defs.push({id,category,description,build,dynamicNodes});}
asset('floor-tile','architecture','Lantai tileable 4 × 4 meter.',()=>{
  const g=group('floor-tile');box(g,'slab',[4,.14,4],[0,-.07,0],'floor');
  for(const z of [-1.93,1.93])box(g,'seam',[3.9,.012,.022],[0,.01,z],'steel');return g;
});
asset('wall-panel','architecture','Dinding inset dengan dua lampu linear.',()=>{
  const g=group('wall-panel');box(g,'shell',[4,3.2,.2],[0,1.6,0],'ceramic',true);box(g,'inset',[3.62,2.7,.025],[0,1.65,.115],'graphite');
  for(const x of [-1.65,1.65])box(g,'light',[.045,2.45,.03],[x,1.65,.15],'cyan');box(g,'skirting',[4,.26,.3],[0,.13,.05],'steel');return g;
});
asset('structural-arch','architecture','Portal setinggi 6 meter dengan bukaan 6 meter.',()=>{
  const g=group('structural-arch');for(const x of [-3.2,3.2]){box(g,'pillar',[.35,6,.5],[x,3,0],'ceramic',true);box(g,'light',[.04,5,.035],[x,3,.27],'cyan');}
  box(g,'lintel',[6.75,.3,.5],[0,6,0],'ceramic',true);return g;
});
asset('station-plinth','architecture','Alas modular instrumen.',()=>{const g=group('station-plinth');pedestal(g);return g;});
asset('operator-console','architecture','Konsol dengan permukaan label/layar runtime.',()=>{
  const g=group('operator-console');pedestal(g,1.5,1);box(g,'stem',[.55,.9,.55],[0,.7,0],'steel',true);
  const p=panel(g,'console',[0,1.1,0],1.3,.7);p.rotation.x=-.25;box(g,'controls',[1.35,.09,.4],[0,1,.4],'graphite',true);return g;
},['socket_display']);
asset('wayfinding-pylon','architecture','Papan penunjuk stasiun dengan anchor teks.',()=>{
  const g=group('wayfinding-pylon');box(g,'foot',[.8,.12,.65],[0,.06,0],'steel',true);box(g,'pylon',[.66,2.2,.25],[0,1.2,0],'ceramic',true);
  box(g,'label_surface',[.5,1.5,.03],[0,1.38,.15],'screen');box(g,'beacon',[.55,.06,.06],[0,2.25,.16],'amber');socket(g,'label',[0,1.4,.18],'station-title');return g;
});
asset('data-rail','architecture','Rel aliran data sepanjang 4 meter.',()=>{
  const g=group('data-rail');box(g,'rail',[4,.08,.28],[0,.04,0],'graphite',true);box(g,'signal',[4,.025,.07],[0,.095,0],'cyan');
  socket(g,'in',[-2,.1,0],'data-in');socket(g,'out',[2,.1,0],'data-out');return g;
});
asset('token-capsule','primitive','Kapsul token dengan label dan band posisi.',()=>{
  const g=group('token-capsule');box(g,'body',[.7,.5,.34],[0,.25,0],'ceramic',true);box(g,'text_face',[.58,.34,.03],[0,.26,.19],'screen');
  box(g,'position_band',[.5,.035,.035],[0,.07,.195],'cyan');socket(g,'label',[0,.26,.22],'token-label');return g;
},['position_band','socket_label']);
asset('vector-arrow','primitive','Panah unit 1 meter sepanjang +Y, pivot pangkal.',()=>{
  const g=group('vector-arrow');cyl(g,'shaft',.035,.74,[0,.37,0],'amber',12);mesh(g,'tip',new T.ConeGeometry(.11,.26,12),'amber',[0,.87,0]);return g;
},['shaft','tip']);
asset('neuron-bead','primitive','Node aktivasi untuk instancing.',()=>{const g=group('neuron-bead');sphere(g,'activation',.12,[0,0,0],'green');return g;},['activation']);
asset('signal-packet','primitive','Partikel paket tensor.',()=>{const g=group('signal-packet');mesh(g,'packet',new T.OctahedronGeometry(.12),'cyan');return g;},['packet']);
asset('matrix-cell','primitive','Sel heatmap tunggal, label dibuat runtime.',()=>{const g=group('matrix-cell');box(g,'cell',[.38,.28,.035],[0,0,0],'cyan',true);return g;},['cell']);
asset('tokenizer-bench','instrument','Scanner token, conveyor, dan socket input/output.',()=>{
  const g=group('tokenizer-bench');pedestal(g,5.4,3);box(g,'housing',[5,.8,2],[0,.74,0],'ceramic',true);box(g,'conveyor',[4.8,.1,1.2],[0,1.2,.2],'graphite',true);
  for(let x=-2.1;x<=2.1;x+=.35)box(g,'roller',[.055,.04,1.1],[x,1.28,.2],'steel');
  for(const x of [-.45,.45])box(g,'scanner_pillar',[.14,1.6,1.5],[x,1.8,.2],'steel',true);
  box(g,'scanner_top',[1.1,.15,1.5],[0,2.63,.2],'ceramic',true);box(g,'scanner_light',[.75,.025,1.3],[0,2.53,.2],'cyan');
  socket(g,'input',[-2.1,1.55,.2],'token-input');socket(g,'output',[2.1,1.55,.2],'token-output');
  for(let i=0;i<4;i++){const t=defs.find(d=>d.id==='token-capsule').build();t.name=`demo_token_${i}`;t.position.set(.6+i*.55,1.3,.2);t.scale.setScalar(.65);g.add(t);}return g;
},['demo_token_*','scanner_light']);
asset('embedding-projector','instrument','Meja proyeksi dengan sumbu abstrak dan titik ilustrasi.',()=>{
  const g=group('embedding-projector');pedestal(g,4.8,4.1);cyl(g,'body',1.6,.65,[0,.65,0],'ceramic');cyl(g,'top',1.5,.12,[0,1.02,0],'screen');
  torus(g,'projector_ring',1.35,.025,[0,1.1,0],'cyan');torus(g,'coordinate_ring',1.55,.016,[0,2.8,0],'steel',[0,0,0]);
  for(const [end,c] of [[[1.6,1.3,0],'cyan'],[[0,3.4,0],'green'],[[0,1.3,1.6],'violet']])pipe(g,`axis_${c}`,[[0,1.3,0],end],c,.022);
  for(let i=0;i<12;i++)sphere(g,`demo_point_${i}`,.075,[Math.sin(i*2.4)*1.1,1.5+(i%4)*.43,Math.cos(i*1.7)],i%2?'cyan':'amber');
  socket(g,'space',[0,2.1,0],'vector-origin');return g;
},['demo_point_*']);
asset('matrix-board','instrument','Papan matriks 4 × 4, sel ilustrasi dapat disembunyikan.',()=>{
  const g=group('matrix-board');pedestal(g,3.2,1.3);box(g,'support',[.16,.9,.18],[0,.7,0],'steel');panel(g,'matrix',[0,1,0],2.6,2.2);
  grid(g,'demo_cells',4,4,2.4,1.85,'cyan',[0,1.1,.15]);return g;
},['demo_cells','socket_display']);
asset('qkv-projector','instrument','Tiga panel Q/K/V dengan bus proyeksi.',()=>{
  const g=group('qkv-projector');pedestal(g,6,3.2);
  for(let i=0;i<3;i++){const x=(i-1)*1.82,c=['cyan','violet','amber'][i],n=['Q','K','V'][i];box(g,`support_${n}`,[.16,.85,.2],[x,.7,0],'steel');
    panel(g,n,[x,1.05,0],1.5,2.15,c);grid(g,`demo_${n}`,4,3,1.3,1.8,c,[x,1.16,.16]);socket(g,n,[x,1.1,1],'projected-tensor');}
  box(g,'projection_bus',[5.4,.08,.12],[0,.58,.65],'green');return g;
},['demo_Q','demo_K','demo_V']);
asset('attention-workbench','instrument','Heatmap kausal 6 × 6 dan output collector.',()=>{
  const g=group('attention-workbench');pedestal(g,5.6,3.4);box(g,'desk',[4.8,.8,2.5],[0,.73,0],'ceramic',true);
  panel(g,'scores',[0,1.25,-.45],4.2,2.8,'violet');grid(g,'demo_attention',6,6,3.95,2.5,'violet',[0,1.36,-.29],true);
  for(let i=0;i<6;i++)cyl(g,`demo_output_${i}`,.14,.10+i*.05,[(i-2.5)*.55,1.23+i*.025,.9],'amber');
  socket(g,'query',[-2.3,2.7,0],'query-in');socket(g,'context',[2.3,1.7,0],'context-out');return g;
},['demo_attention','demo_output_*']);
asset('causal-mask','instrument','Panel segitiga atas untuk menutup sel masa depan.',()=>{
  const g=group('causal-mask');for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)box(g,`mask_${i}_${j}`,[.43,.33,.09],[(j-2.5)*.5,(5-i)*.4,0],'steel');return g;
},['mask_*']);
asset('head-combiner','instrument','Dua jalur head menuju proyeksi output.',()=>{
  const g=group('head-combiner');pedestal(g,3.8,2.6);for(const [x,c] of [[-.9,'cyan'],[.9,'violet']]){
    cyl(g,`head_${c}`,.45,1.7,[x,1.15,0],c);pipe(g,`route_${c}`,[[x,2,0],[x,2.5,0],[0,2.9,0]],c);}
  box(g,'output_projection',[1.1,.45,.65],[0,3.1,0],'ceramic',true);socket(g,'output',[0,3.4,0],'concat-projection-out');return g;
});
asset('transformer-stack','instrument','12 blok skematis; setiap blok memuat attention dan MLP.',()=>{
  const g=group('transformer-stack');pedestal(g,4,3.3);for(const x of [-1.7,1.7])box(g,'frame',[.13,5.2,.16],[x,2.9,-1.05],'steel');
  for(let i=0;i<12;i++){const l=group(`layer_${String(i).padStart(2,'0')}`);l.position.y=.54+i*.41;g.add(l);
    box(l,'block',[3.3,.25,2.6],[0,0,0],'ceramic',true);box(l,'attention_strip',[1.2,.06,.035],[-.8,0,1.32],'cyan');box(l,'mlp_strip',[1.2,.06,.035],[.8,0,1.32],'green');socket(l,'inspect',[0,0,1.5],'layer-detail');}
  pipe(g,'residual_bypass',[[-1.9,.5,.8],[-2.15,2.8,.8],[-1.9,5.1,.8]],'amber',.07);return g;
},['layer_*','residual_bypass']);
asset('normalization-chamber','instrument','Instrumen before/after LayerNorm.',()=>{
  const g=group('normalization-chamber');pedestal(g,3.3,2.3);for(let i=0;i<3;i++)torus(g,`ring_${i}`,.85,.04,[0,1.45,-.6+i*.6],'ceramic',[0,0,0]);
  box(g,'channel',[2.2,.12,1.6],[0,.45,0],'steel');socket(g,'before',[0,1.45,.8],'normalization-in');socket(g,'after',[0,1.45,-.8],'normalization-out');return g;
});
asset('mlp-lattice','instrument','Siluet expansion/contraction 4 → 12 → 4; bukan dimensi tensor.',()=>{
  const g=group('mlp-lattice');pedestal(g,4.6,3);for(let c=0;c<3;c++){const n=c===1?12:4;
    for(let i=0;i<n;i++)sphere(g,`activation_${c}_${i}`,.09,[(c-1)*1.5,.7+(i%4)*.56,c===1?(Math.floor(i/4)-1)*.65:0],c===1?'green':'cyan');}
  for(let i=0;i<4;i++)pipe(g,`demo_connection_${i}`,[[-1.5,.7+i*.56,0],[0,.7+((i+1)%4)*.56,0],[1.5,.7+i*.56,0]],'steel',.015);
  socket(g,'input',[-1.7,1.5,0],'mlp-in');socket(g,'output',[1.7,1.5,0],'mlp-out');return g;
},['activation_*','demo_connection_*']);
asset('residual-conduit','instrument','Jalur bypass residual dan titik penjumlahan.',()=>{
  const g=group('residual-conduit');pipe(g,'bypass',[[-1.5,0,0],[-1.5,1.3,0],[0,1.7,0],[1.5,1.3,0],[1.5,0,0]],'amber',.065);
  sphere(g,'add_node',.18,[1.5,0,0],'amber');socket(g,'in',[-1.5,0,0],'residual-in');socket(g,'sum',[1.5,0,0],'residual-add');return g;
});
asset('logits-amphitheater','instrument','Lima podium kandidat dan anchor massa probabilitas lainnya.',()=>{
  const g=group('logits-amphitheater');pedestal(g,5.9,3.5);for(let i=0;i<5;i++){const x=(i-2),h=[2.55,1.65,1,.6,.32][i];
    cyl(g,`podium_${i}`,.41,.22,[x,.43,0],'steel');box(g,`demo_probability_${i}`,[.5,h,.5],[x,.56+h/2,0],i===0?'amber':'cyan',true);socket(g,`candidate_${i}`,[x,.55,.6],'candidate-label');}
  socket(g,'others',[0,.35,1.45],'probability-other');return g;
},['demo_probability_*']);
asset('kv-cache-rack','instrument','Dua kolom laci K/V dengan slot layer dan posisi.',()=>{
  const g=group('kv-cache-rack');pedestal(g,4.3,2.5);box(g,'back',[3.8,3.6,.16],[0,2,-.8],'graphite');
  for(const [x,c] of [[-.94,'violet'],[.94,'amber']]){box(g,`cabinet_${c}`,[1.74,3.6,1.6],[x,2,0],'ceramic',true);
    for(let i=0;i<6;i++){const tray=box(g,`cache_${c}_${i}`,[1.5,.42,.06],[x,.55+i*.55,.84],'screen',true);tray.userData={role:c==='violet'?'K':'V',slot:i};
      for(let j=0;j<4;j++)box(g,`slot_${c}_${i}_${j}`,[.22,.16,.04],[x-.5+j*.33,.55+i*.55,.89],c);}}
  socket(g,'append',[0,3.9,0],'new-kv-row');return g;
},['slot_*','cache_*']);

const models=new Map(defs.map(d=>[d.id,d.build()]));
const stations=[
  ['tokenizer','01','Tokenizer','tokenizer-bench',[-12,0,-7],0],
  ['embedding','02','Embedding + position','embedding-projector',[-4,0,-7],0],
  ['qkv','03','Q / K / V','qkv-projector',[4,0,-7],0],
  ['attention','04','Causal attention','attention-workbench',[12,0,-7],0],
  ['transformer','05','Transformer blocks','transformer-stack',[12,0,7],Math.PI],
  ['sampling','06','Next-token sampling','logits-amphitheater',[4,0,7],Math.PI],
  ['cache','07','Decode + KV cache','kv-cache-rack',[-4,0,7],Math.PI],
  ['analogy','08','Vector analogy annex','embedding-projector',[-12,0,7],Math.PI]
].map(([id,number,title,model,position,rotationY])=>({id,number,title,model,position,rotationY,
  camera:{position:[position[0],3.4,position[2]+(rotationY?-5.2:5.2)],target:[position[0],1.8,position[2]]}}));
const assembly=group('NeuroLab_Observatory');
function place(id,name,p,r=0){const o=models.get(id).clone(true);o.name=name;o.position.set(...p);o.rotation.y=r;assembly.add(o);return o;}
for(let x=-16;x<=16;x+=4)for(let z=-10;z<=10;z+=4)place('floor-tile',`floor_${x}_${z}`,[x,0,z]);
for(let x=-16;x<=16;x+=4)place('wall-panel',`north_wall_${x}`,[x,0,-12]);
for(const x of [-18,18])for(let z=-10;z<=10;z+=4)place('wall-panel',`side_wall_${x}_${z}`,[x,0,z],x<0?Math.PI/2:-Math.PI/2);
for(const x of [-16,0,16])place('structural-arch',`arch_${x}`,[x,0,0],Math.PI/2);
for(const s of stations){place(s.model,`station_${s.id}`,s.position,s.rotationY);
  place('wayfinding-pylon',`sign_${s.id}`,[s.position[0]-3.1,0,s.position[2]],s.rotationY);
  socket(assembly,`label_${s.id}`,[s.position[0],s.id==='transformer'?5.9:4.2,s.position[2]],'station-label').userData.title=`${s.number} / ${s.title}`;}
pipe(assembly,'tour_data_spine',[[-12,.12,-4],[-4,.12,-4],[4,.12,-4],[12,.12,-4],[15,.12,0],[12,.12,4],[4,.12,4],[-4,.12,4],[-12,.12,4]],'cyan',.045);
for(let i=0;i<9;i++)box(assembly,`center_dash_${i}`,[.8,.025,.045],[-12+i*3,.04,0],'steel');
socket(assembly,'spawn',[0,1.65,10.5],'pov-spawn');

async function save(g,id,meta){
  g.updateMatrixWorld(true);const bytes=Buffer.from(await new GLTFExporter().parseAsync(g,{binary:true,onlyVisible:false,trs:true}));
  await fs.writeFile(path.join(out,`${id}.glb`),bytes);
  const bounds=new T.Box3().setFromObject(g);let triangles=0,meshNodes=0;const materialNames=new Set(),sockets=[];
  g.traverse(o=>{if(o.isMesh){meshNodes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materialNames.add(o.material.name);}
    if(o.userData.socket)sockets.push({name:o.name,localPosition:o.position.toArray(),worldPosition:o.getWorldPosition(new T.Vector3()).toArray(),role:o.userData.role});});
  return {id,file:`${id}.glb`,...meta,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles,meshNodes,
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},materials:[...materialNames],sockets};
}
const entries=[];
for(const {id,category,description,dynamicNodes} of defs)entries.push(await save(models.get(id),id,{category,description,dynamicNodes}));
entries.push(await save(assembly,'lab-assembled',{category:'assembly',description:'Susunan referensi lab; bukan scene produksi yang sudah dioptimasi.',dynamicNodes:['station_*','tour_data_spine']}));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schemaVersion:1,kit:'NeuroLab Observatory',version:'1.0.0',units:'meter',upAxis:'+Y',frontAxis:'+Z',
  provenance:'Original procedural geometry; no third-party model/texture files.',license:'MIT; see LICENSE.txt',palette,assets:entries},null,2)+'\n');
await fs.writeFile(path.join(out,'layout.json'),JSON.stringify({schemaVersion:1,room:{width:36,depth:24},overview:{position:[28,25,33],target:[0,1,0]},
  spawn:[0,1.65,10.5],stations,navigation:{walkableAisle:{min:[-16,0,-4],max:[16,0,4]},note:'Planning metadata, not a collision implementation.'}},null,2)+'\n');
console.log(JSON.stringify({files:entries.length,totalBytes:entries.reduce((n,e)=>n+e.bytes,0),assemblyTriangles:entries.at(-1).triangles,output:out},null,2));
