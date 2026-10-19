import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png'};
const allowed=['/preview/','/public/assets/lab-v1/','/node_modules/three/build/','/node_modules/three/examples/jsm/'];
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.writeHead(302,{Location:'/preview/'});res.end();return;}
    let name=decodeURIComponent(url.pathname);
    if(!allowed.some(prefix=>name.startsWith(prefix))){res.writeHead(404);res.end('Not found');return;}
    if(name.endsWith('/'))name+='index.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.NEUROLAB_PREVIEW_PORT??4173);
server.listen(port,'127.0.0.1',()=>console.log(`NeuroLab asset catalog: http://127.0.0.1:${port}/preview/`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
