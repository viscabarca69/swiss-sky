// Starre Teile einer Gruppe je Material zu einem Mesh zusammenfassen (weniger Draw-Calls).
// skip(o) = true: Objekt samt Kindern bleibt unverändert (z. B. bewegte Teile).
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function bakeStatic(root,skip){
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map(),drop=[];
  const walk=o=>{if(o!==root&&skip&&skip(o))return;
    if(o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&!Array.isArray(o.material)&&!o.material.transparent&&o.geometry&&o.geometry.attributes.position){
      let vis=true;for(let q=o;q&&q!==root;q=q.parent)if(!q.visible){vis=false;break;}
      if(vis){const g=o.geometry.clone();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
        if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
        if(!g.index){const n=g.attributes.position.count,ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));}
        g.morphAttributes={};g.groups=[];const m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(m);
        if(m.determinant()<0){const a=g.index.array;for(let k=0;k<a.length;k+=3){const t=a[k];a[k]=a[k+1];a[k+1]=t;}}
        const key=o.material.uuid+(o.castShadow?'s':'')+(o.receiveShadow?'r':'');if(!groups.has(key))groups.set(key,{mat:o.material,cs:o.castShadow,rs:o.receiveShadow,gs:[]});groups.get(key).gs.push(g);drop.push(o);}}
    for(const c of o.children.slice())walk(c);};
  walk(root);
  for(const o of drop){if(o.children.length){const p=o.parent;for(const c of o.children.slice()){o.remove(c);c.applyMatrix4(o.matrix);p.add(c);}}o.parent&&o.parent.remove(o);}
  let n=0;for(const {mat,cs,rs,gs} of groups.values()){if(gs.length<2&&!drop.length)continue;
    for(const g of gs)if(g.index.array instanceof Uint16Array)g.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array),1));
    const mg=mergeGeometries(gs,false);if(!mg)continue;mg.computeBoundingSphere();const mm=new THREE.Mesh(mg,mat);mm.castShadow=cs;mm.receiveShadow=rs;mm.userData.baked=1;root.add(mm);n++;gs.forEach(g=>g.dispose());}
  root.userData.baked=true;return root;}
