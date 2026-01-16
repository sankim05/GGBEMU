import { GABECPU } from './cpu.js';
import { GABEPPU } from './ppu.js';
import { gabememory } from './memory.js';
import { GABEdebugger } from './debug.js';
import { GABEjoy } from './joypad.js';
let running = false;
let clockhz = 4194304;
let lastTime = 0;
let accTime  = 0; 
let accTimer = 0;
let tcycle = 0;
let debugging = false;
const msPerTimer = 1000/60;
let uploadedfile = null;
const reader = new FileReader();
  



const originalramshowdiv = document.getElementById("ramcopy");
for(let i=0;i<15;i++){
    let clonednode = originalramshowdiv.cloneNode(true);
    if(i===7) clonednode.querySelector(".ramshow1idx").style.backgroundColor = "fuchsia";
    originalramshowdiv.parentNode.insertBefore(clonednode,originalramshowdiv.nextSibling);
    
}
const originalrdv2big = document.getElementById("ramshower2copy");
for(let i=0;i<3;i++){
    const clonez = originalrdv2big.cloneNode(true);
 originalrdv2big.parentNode.insertBefore(clonez,originalrdv2big.nextSibling);
    const clone2 = clonez.querySelector(".ramcopyz");
for(let j=0;j<15;j++){
    clonez.insertBefore(clone2.cloneNode(true),clone2.nextSibling);

}
}
const clone3 = originalrdv2big.querySelector(".ramcopyz");
for(let j=0;j<15;j++){
    originalrdv2big.insertBefore(clone3.cloneNode(true),clone3.nextSibling);

}
const memory = new gabememory();
const cpu = new GABECPU(memory);
const ppu = new GABEPPU(memory);
const joypad = new GABEjoy(memory);
memory.ppuinfo = ppu;

memory.joypad = joypad;
var canvas = document.getElementById("Display");
if (canvas.getContext) {
var ctx = canvas.getContext("2d"); 
ctx.fillStyle = "rgb(0, 0, 0)"
ctx.fillRect(0, 0, 480, 432);
ppu.canvas = ctx;
}
var canvas2 = document.getElementById("DEBUGPPUBACKGROUND");
if (canvas2.getContext) {
var ctx2 = canvas2.getContext("2d"); 
ctx2.fillStyle = "rgb(0, 0, 0)"
ctx2.fillRect(0, 0, 256, 256);
ppu.debugbackcanvas = ctx2;
}
var canvas3 = document.getElementById("DEBUGPPUWINDOW");
if (canvas3.getContext) {
var ctx3 = canvas3.getContext("2d"); 
ctx3.fillStyle = "rgb(0, 0, 0)"
ctx3.fillRect(0, 0, 256, 256);

ppu.debugwincanvas = ctx3;
}




function reset(){
    //console.log(cpu.fstring);
    running = false;
    document.getElementById("pausedtxt").textContent = "현재 정지 중";
    clockhz = 4194304;
    document.getElementById("Speedshow").textContent = "4.19Mhz";
    lastTime = 0;
    accTime  = 0; 
    accTimer = 0;
    tcycle = 0;
    cpu.reset();
    ppu.reset();
    memory.reset();
    joypad.reset();
    ppu.showscreen();
    debuggers.showall();
};

function tharg(arraybfer){
    const array2 = new Uint8Array(arraybfer);
    memory.rom = array2;
    reset();

}

reader.onload = function(e) {
    const arrayBufferz = e.target.result; 
    tharg(arrayBufferz); 
};

const debuggers = new GABEdebugger(memory,cpu,ppu);

function runLoop(now) {
  if (!running) {
    lastTime = now;
    return;
  }

  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime;
  accTime  += delta;
  accTimer += delta;
  lastTime = now;

  let msPerTick = 1000 / clockhz;

  if (accTimer >= msPerTimer) {
    
    //console.log(memory.currentrombank + " " + memory.bankingmode);
    //console.log(memory.PPUreadByte(0xFF00).toString(2));
    if(debugging){
        debuggers.showall();
        
    }
ppu.showscreen();

        
       
    accTimer -= msPerTimer;
  }  
  while (accTime >= msPerTick) {
    tcycle++;
    ppu.cyclerun();
    
    if(tcycle%4===0)cpu.cyclerun();
    if(cpu.mcycle == 5224910){
        debuggers.showall();
        running = false;
        break;
    }
    
    /*
    if(tcycle%456==0){
        if(ppu.getly()<144){
            console.log(memory.PPUreadByte(0xFF0F)&1);
        }
    }
    */
    if(tcycle==Number.MAX_SAFE_INTEGER) tcycle = 0;
    accTime -= msPerTick;
  }

  requestAnimationFrame(runLoop);
}

document.getElementById("EmuReset").addEventListener("click",reset);
document.getElementById("EmuRun").addEventListener("click",async function(){
    if(running) return;
    
    running = true;
    document.getElementById("pausedtxt").textContent = "현재 실행 중";
    lastTime = 0;
    accTime  = 0;
    accTimer = 0;
    requestAnimationFrame(runLoop);
});
function pausezzz(){
    document.getElementById("pausedtxt").textContent = "현재 정지 중";
    running = false;
    debuggers.showall();
    

}
document.getElementById("EmuPause").addEventListener("click",pausezzz);

window.onblur = pausezzz;

document.getElementById("EmuStep").addEventListener("click",function(){


    if (!running){
        
        for(let i=0;i<4;i++)ppu.cyclerun();
        cpu.cyclerun();
        ppu.showscreen();
        debuggers.showall();
    } 



});

document.getElementById("Speeddown").addEventListener("click",function(){
    if(clockhz>1)clockhz = clockhz >> 1;
    if(clockhz>=1000000) document.getElementById("Speedshow").textContent = (clockhz/1000000).toFixed(2) + "Mhz";
    else if(clockhz>=1000) document.getElementById("Speedshow").textContent = (clockhz/1000).toFixed(2) + "Khz";
    else document.getElementById("Speedshow").textContent = clockhz + "hz";
});
document.getElementById("Speedup").addEventListener("click",function(){
    if(clockhz<32000000)clockhz = clockhz << 1;
    if(clockhz>=1000000) document.getElementById("Speedshow").textContent = (clockhz/1000000).toFixed(2) + "Mhz";
    else if(clockhz>=1000) document.getElementById("Speedshow").textContent = (clockhz/1000).toFixed(2) + "Khz";
    else document.getElementById("Speedshow").textContent = clockhz + "hz";

});
document.getElementById("DEBUGOPENbtn").addEventListener("click",function(){
    debugging = !debugging;
    if(debugging){
        document.getElementById("DEBUGPANEL").style.display = "block";
    }else{
        document.getElementById("DEBUGPANEL").style.display = "none";
    }
});

document.getElementById("userUpload").addEventListener('change',function(event){
    if(event.target.files.length > 0){
        uploadedfile = event.target.files[0];
        reader.readAsArrayBuffer(uploadedfile); 
    }else{
        uploadedfile = null;
    }
    
});



reset();


