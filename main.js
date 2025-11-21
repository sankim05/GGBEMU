import { GABECPU } from './cpu.js';
import { GABEPPU } from './ppu.js';
import { gabememory } from './memory.js';
import { GABEdebugger } from './debug.js';
let running = false;
let clockhz = 4194304;
let lastTime = 0;
let accTime  = 0; 
let accTimer = 0;
let tcycle = 0;
const msPerTimer = 1000/60;
let uploadedfile = null;
const reader = new FileReader();

let btnbitsK = 0xF;
let dpadbitsK = 0xF;
let btnbitsB = 0xF;
let dpadbitsB = 0xF;        

const memory = new gabememory();
const cpu = new GABECPU(memory);
const ppu = new GABEPPU(memory,ctx);
memory.ppuinfo = ppu;

var canvas = document.getElementById("Display");
if (canvas.getContext) {
var ctx = canvas.getContext("2d"); 
ctx.fillStyle = "rgb(0, 0, 0)"
ctx.fillRect(0, 0, 480, 432);
ppu.canvas = ctx;
}



function updateinput(){
    let btnmask = 0;
    let dpadmask = 0;
    const statusx = memory.readByte(0xFF00); 
    if(statusx&0x10){
        dpadmask = 0xF;
    }
    if(statusx&0x20){
        btnmask = 0xF;
    }
    let finval = ((btnbitsB&btnbitsK)|btnmask) & ((dpadbitsB&dpadbitsK)|dpadmask);
    memory.writeByte(0xFF00,(statusx&0x30)|finval);

    //console.log(finval.toString(2));
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


document.getElementById("DpadDown").addEventListener("mousedown",function(){
    dpadbitsB = dpadbitsB & 7;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("DpadDown").addEventListener("mouseup",function(){
    dpadbitsB = dpadbitsB | 8;
    if(dpadbitsK&8){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("DpadUp").addEventListener("mousedown",function(){
    dpadbitsB = dpadbitsB & 0xB;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("DpadUp").addEventListener("mouseup",function(){
    dpadbitsB = dpadbitsB | 4;
    if(dpadbitsK&4){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("DpadLeft").addEventListener("mousedown",function(){
    dpadbitsB = dpadbitsB & 0xD;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("DpadLeft").addEventListener("mouseup",function(){
    dpadbitsB = dpadbitsB | 2;
    if(dpadbitsK&2){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("DpadRight").addEventListener("mousedown",function(){
    dpadbitsB = dpadbitsB & 0xE;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("DpadRight").addEventListener("mouseup",function(){
    dpadbitsB = dpadbitsB | 1;
    if(dpadbitsK&1){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});

document.getElementById("BtnStart").addEventListener("mousedown",function(){
    btnbitsB = btnbitsB & 7;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("BtnStart").addEventListener("mouseup",function(){
    btnbitsB = btnbitsB | 8;
    if(btnbitsK&8){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("BtnSelect").addEventListener("mousedown",function(){
    btnbitsB = btnbitsB & 0xB;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "LightGrey";
});
document.getElementById("BtnSelect").addEventListener("mouseup",function(){
    btnbitsB = btnbitsB | 4;
    if(btnbitsK&4){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("BtnB").addEventListener("mousedown",function(){
    btnbitsB = btnbitsB & 0xD;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "DarkRed";
});
document.getElementById("BtnB").addEventListener("mouseup",function(){
    btnbitsB = btnbitsB | 2;
    if(btnbitsK&2){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});
document.getElementById("BtnA").addEventListener("mousedown",function(){
    btnbitsB = btnbitsB & 0xE;
    memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
    updateinput(); 
    this.style.backgroundColor = "DarkRed";
});
document.getElementById("BtnA").addEventListener("mouseup",function(){
    btnbitsB = btnbitsB | 1;
    if(btnbitsK&1){
        updateinput(); 
        this.style.backgroundColor = "";
    }
});


document.addEventListener("keydown",function(event){
    switch(event.key.toUpperCase()){
        case "S":
            dpadbitsK = dpadbitsK & 7;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("DpadDown").style.backgroundColor = "LightGrey";              
        break;
        case "W":
            dpadbitsK = dpadbitsK & 0xB;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("DpadUp").style.backgroundColor = "LightGrey";              
        break;
        case "A":
            dpadbitsK = dpadbitsK & 0xD;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("DpadLeft").style.backgroundColor = "LightGrey";              
        break;
        case "D":
            dpadbitsK = dpadbitsK & 0xE;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("DpadRight").style.backgroundColor = "LightGrey";              
        break;
        case "V":
            btnbitsK = btnbitsK & 7;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("BtnStart").style.backgroundColor = "LightGrey";              
        break;
        case "B":
            btnbitsK = btnbitsK & 0xB;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("BtnSelect").style.backgroundColor = "LightGrey";              
        break;
        case "J":
            btnbitsK = btnbitsK & 0xD;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("BtnB").style.backgroundColor = "DarkRed";              
        break;
        case "K":
            btnbitsK = btnbitsK & 0xE;
            memory.writeByte(0xFF0F,memory.readByte(0xFF0F)|0x10);
            updateinput();
            document.getElementById("BtnA").style.backgroundColor = "DarkRed";              
        break;                                 
    }
});

document.addEventListener("keyup",function(event){
    switch(event.key.toUpperCase()){
        case "S":
            dpadbitsK = dpadbitsK | 8;
            if(dpadbitsB&8){
                updateinput();
                document.getElementById("DpadDown").style.backgroundColor = "";
            }     
        break;
        case "W":
            dpadbitsK = dpadbitsK | 4;
            if(dpadbitsB&4){
                updateinput();
                document.getElementById("DpadUp").style.backgroundColor = "";
            }     
        break;
        case "A":
            dpadbitsK = dpadbitsK | 2;
            if(dpadbitsB&2){
                updateinput();
                document.getElementById("DpadLeft").style.backgroundColor = "";
            }     
        break;
        case "D":
            dpadbitsK = dpadbitsK | 1;
            if(dpadbitsB&1){
                updateinput();
                document.getElementById("DpadRight").style.backgroundColor = "";
            }     
        break;
        case "V":
            btnbitsK = btnbitsK | 8;
            if(btnbitsB&8){
                updateinput();
                document.getElementById("BtnStart").style.backgroundColor = "";
            }     
        break;
        case "B":
            btnbitsK = btnbitsK | 4;
            if(btnbitsB&4){
                updateinput();
                document.getElementById("BtnSelect").style.backgroundColor = "";
            }     
        break;
        case "J":
            btnbitsK = btnbitsK | 2;
            if(btnbitsB&2){
                updateinput();
                document.getElementById("BtnB").style.backgroundColor = "";
            }     
        break;
        case "K":
            btnbitsK = btnbitsK | 1;
            if(btnbitsB&1){
                updateinput();
                document.getElementById("BtnA").style.backgroundColor = "";
            }     
        break;                         
    }
});