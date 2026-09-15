import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'; import {PNG} from 'pngjs'; import pixelmatch from 'pixelmatch'
const HERE=path.dirname(fileURLToPath(import.meta.url)).replace(/\/_verify$/,'')
const ref=PNG.sync.read(fs.readFileSync(path.join(HERE,'_reference/page-1x.png')))
// compare only the wordmark strip so the photo doesn't drown the signal
const X0=1690,X1=1920,Y0=75,Y1=842,W=X1-X0,H=Y1-Y0
const cut=(png)=>{const o=new PNG({width:W,height:H})
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const s=(png.width*(y+Y0)+(x+X0))<<2,d=(W*y+x)<<2
    o.data[d]=png.data[s];o.data[d+1]=png.data[s+1];o.data[d+2]=png.data[s+2];o.data[d+3]=255}
  return o}
const A=cut(ref)
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1})
await p.goto('file://'+path.join(HERE,'index.html'),{waitUntil:'networkidle'})
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500)
const ASPECT=499/1638
async function score(deg,w,top){
  await p.evaluate(({deg,w,top,ASPECT})=>{
    const m=document.querySelector('.hero__mark')
    const thick=w*ASPECT
    m.style.width=w+'px'; m.style.height='auto'; m.style.transformOrigin='0 0'
    m.style.transform=`rotate(${deg}deg)`
    // rotate(90) puts the box left of `left`; rotate(-90) puts it below/right of `left`
    if(deg===90){ m.style.left=(1744+thick)+'px'; m.style.top=top+'px' }
    else { m.style.left='1744px'; m.style.top=(top+w)+'px' }
  },{deg,w,top,ASPECT})
  await p.waitForTimeout(90)
  const shot=PNG.sync.read(await p.screenshot({fullPage:true}))
  const B=cut(shot); const d=new PNG({width:W,height:H})
  return 1-pixelmatch(A.data,B.data,d.data,W,H,{threshold:0.12,includeAA:false})/(W*H)
}
let best={s:0}
for(const deg of [-90]) for(const w of [800,820,840,860,880,900,930,960]) for(const top of [-20,-10,0,10,20]){
  const s=await score(deg,w,top); if(s>best.s) best={s,deg,w,top}
}
console.log('BEST', JSON.stringify(best), ' match', (best.s*100).toFixed(2)+'%')
// print the neighbourhood of the winner
for(const w of [best.w-15,best.w-8,best.w,best.w+8,best.w+15]){ const s=await score(best.deg,w,best.top)
  console.log(`   deg=${best.deg} w=${w} top=${best.top} -> ${(s*100).toFixed(2)}%`) }
await b.close()
