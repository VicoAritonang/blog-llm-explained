import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id),base='/public/assets/lab-v1/';
const viewport=$('viewport'),loading=$('loading');
const nice=id=>id.split('-').map(w=>['qkv','kv','mlp'].includes(w)?w.toUpperCase():w[0].toUpperCase()+w.slice(1)).join(' ');
async function main(){
  const [manifest,layout]=await Promise.all([fetch(base+'manifest.json').then(r=>r.json()),fetch(base+'layout.json').then(r=>r.json())]);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.outputColorSpace=T.SRGBColorSpace;
  viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Model 3D. Gunakan daftar aset dan tombol reset untuk navigasi.');
  const scene=new T.Scene();scene.background=new T.Color('#101c27');
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight('#cce6ff','#263647',.7));const key=new T.DirectionalLight('#fff2db',1.8);key.position.set(-10,20,15);scene.add(key);
  const fill=new T.DirectionalLight('#a7cfff',.6);fill.position.set(12,8,-8);scene.add(fill);
  const camera=new T.PerspectiveCamera(40,1,.02,500);const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=.3;controls.maxDistance=100;
  const loader=new GLTFLoader();let current,active,request=0,wire=false,showLabels=true,showDemo=true,anchors=[];
  const assets=[manifest.assets.find(a=>a.id==='lab-assembled'),...manifest.assets.filter(a=>a.id!=='lab-assembled')];
  $('asset-count').textContent=`${assets.length} OBJECTS`;
  function render(){renderer.render(scene,camera);for(const {el,node} of anchors){const p=node.getWorldPosition(new T.Vector3()).project(camera);el.hidden=!showLabels||p.z>1||p.z< -1;el.style.left=`${(p.x*.5+.5)*viewport.clientWidth}px`;el.style.top=`${(-p.y*.5+.5)*viewport.clientHeight}px`;}}
  function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
  new ResizeObserver(resize).observe(viewport);controls.addEventListener('change',render);
  function reset(){if(!current)return;const bounds=new T.Box3().setFromObject(current),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
    if(active.id==='lab-assembled'){camera.position.fromArray(layout.overview.position);controls.target.fromArray(layout.overview.target);}
    else {const radius=size.length()/2;const distance=radius/Math.sin(T.MathUtils.degToRad(camera.fov/2))/Math.min(camera.aspect,1)*1.12;
      camera.position.copy(center).add(new T.Vector3(.8,.5,1.25).normalize().multiplyScalar(distance));controls.target.copy(center);}
    controls.update();render();}
  function release(object){const geos=new Set(),materials=new Set();object.traverse(o=>{if(o.isMesh){geos.add(o.geometry);for(const m of [].concat(o.material))materials.add(m);}});geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  function options(){if(!current)return;current.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))m.wireframe=wire;if(o.name.startsWith('demo_'))o.visible=showDemo;});render();}
  async function select(asset){const ticket=++request;loading.hidden=false;loading.textContent='Memuat model…';try{
    const gltf=await loader.loadAsync(base+asset.file);if(ticket!==request){release(gltf.scene);return;}
    if(current){scene.remove(current);release(current);}current=gltf.scene;active=asset;scene.add(current);$('labels').replaceChildren();anchors=[];
    if(asset.id==='lab-assembled')current.traverse(o=>{if(o.userData.role==='station-label'){const el=document.createElement('span');el.className='station-label';el.textContent=o.userData.title;$('labels').append(el);anchors.push({el,node:o});}});
    $('title').textContent=asset.id==='lab-assembled'?'NeuroLab Observatory':nice(asset.id);$('category').textContent=`${asset.category.toUpperCase()} / ${String(assets.indexOf(asset)+1).padStart(3,'0')}`;
    $('description').textContent=asset.description;$('triangles').textContent=asset.triangles.toLocaleString('en');$('size').textContent=`${(asset.bytes/1024).toFixed(1)} KB`;$('sockets').textContent=asset.sockets.length;
    $('download').href=base+asset.file;document.querySelectorAll('nav button').forEach(b=>{const selected=b.dataset.id===asset.id;b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'true':'false');});
    loading.hidden=true;options();reset();document.title=`${nice(asset.id)} — NeuroLab`;history.replaceState(null,'','#'+asset.id);
  }catch(error){loading.hidden=false;loading.textContent=`Model gagal dimuat: ${error.message}. Pilih aset lain untuk mencoba kembali.`;}}
  function list(){const term=$('search').value.toLowerCase();$('asset-list').replaceChildren();assets.forEach((a,i)=>{if(!`${a.id} ${a.description} ${a.category}`.toLowerCase().includes(term))return;
    const b=document.createElement('button');b.dataset.id=a.id;b.classList.toggle('active',active?.id===a.id);const index=document.createElement('span');index.className='index';index.textContent=String(i+1).padStart(2,'0');const label=document.createElement('span');label.textContent=a.id==='lab-assembled'?'Full laboratory':nice(a.id);b.append(index,label);b.onclick=()=>select(a);$('asset-list').append(b);});}
  $('search').addEventListener('input',list);$('reset').onclick=reset;
  $('wire').onclick=()=>{wire=!wire;$('wire').setAttribute('aria-pressed',wire);options();};
  $('labels-toggle').onclick=()=>{showLabels=!showLabels;$('labels-toggle').setAttribute('aria-pressed',showLabels);render();};
  $('demo').onclick=()=>{showDemo=!showDemo;$('demo').setAttribute('aria-pressed',showDemo);options();};
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();loading.hidden=false;loading.textContent='Konteks 3D terputus. Muat ulang halaman untuk melanjutkan inspeksi.';});
  list();resize();await select(assets.find(a=>a.id===location.hash.slice(1))??assets[0]);
}
main().catch(error=>{loading.textContent=`Pratinjau 3D tidak tersedia: ${error.message}. Dokumen dan berkas GLB tetap dapat diakses dari workspace.`;});
