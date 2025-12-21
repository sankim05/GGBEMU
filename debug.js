
export class GABEdebugger{
    constructor(memory,CPU, PPU){
        this.memory = memory;
        this.CPU = CPU;
        this.PPU = PPU;


    }


    showall(){
        
        this.PPU.showdebugger();
    }


    
}