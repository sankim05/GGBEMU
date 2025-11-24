
export class GABEdebugger{
    constructor(memory,CPU, PPU){
        this.memory = memory;
        this.CPU = CPU;
        this.PPU = PPU;


    }


    showall(){
        document.getElementById("DEBUG").textContent = "DEBUG A = " + this.CPU.registers.A.toString(16) + " B = " + this.CPU.registers.B.toString(16) + " C = " + this.CPU.registers.C.toString(16) + " D = " + this.CPU.registers.D.toString(16)  + " E = " + this.CPU.registers.E.toString(16)  + " F = " + this.CPU.registers.F.toString(16)  + " H = " + this.CPU.registers.H.toString(16)  + " L = " + this.CPU.registers.L.toString(16) + " SP = " + this.CPU.SP.toString(16)  + " PC = " + this.CPU.PC.toString(16) + " INST = " + this.memory.PPUreadByte(this.CPU.PC&0xFFFF).toString(16);
    }

    
}