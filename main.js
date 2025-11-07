import { GABECPU } from './cpu.js';
import { GABEPPU } from './ppu.js';
import { gabememory } from './memory.js';
import { GABEdebugger } from './debug.js';
import { btncon } from './button.js';
let running = false;
let clockhz = 4194304;
let lastTime = 0;
let accTime  = 0; 
let accTimer = 0;
let tcycle = 0;
const msPerTimer = 1000/60;
let uploadedfile = null;
const reader = new FileReader();



const memory = new gabememory();
const cpu = new GABECPU(memory);
const ppu = new GABEPPU(memory,cpu);


const btncontroller = new btncon(memory);

var canvas = document.getElementById("Display");
if (canvas.getContext) {
var ctx = canvas.getContext("2d"); 
ctx.fillStyle = "rgb(100, 48, 122)";
// rgb(142,68,173)
// rgb(155,89,182)
// rgb(183,137,203)
ctx.fillRect(0, 0, 480, 432);
}


function reset(){
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
    ppu.showscreen(ctx);
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
        debuggers.showall();
        ppu.showscreen(canvas);
    accTimer -= msPerTimer;
  }  
  while (accTime >= msPerTick) {
    tcycle++;
    if(tcycle%4==0)cpu.cyclerun();
    ppu.cyclerun();
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

document.getElementById("EmuPause").addEventListener("click",function(){
    document.getElementById("pausedtxt").textContent = "현재 정지 중";
    running = false;
    debuggers.showall();
});
document.getElementById("EmuStep").addEventListener("click",function(){


    if (!running){
        cpu.cyclerun();
        ppu.showscreen(ctx);
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


document.getElementById("userUpload").addEventListener('change',function(event){
    if(event.target.files.length > 0){
        uploadedfile = event.target.files[0];
        reader.readAsArrayBuffer(uploadedfile); 
    }else{
        uploadedfile = null;
    }
    
});


