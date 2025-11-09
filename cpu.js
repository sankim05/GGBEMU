import {gabememory} from './memory.js';

export class GABECPU{
    constructor(memory){
        this.memory = memory;
        this.registers = {
            A : 0x00,
            B : 0x00,
            C : 0x00,
            D : 0x00,
            E : 0x00,
            F : 0x00,
            H : 0x00,
            L : 0x00
        } 
        this.PC = 0x0100;
        this.SP = 0xFFFF;
        this.IME = false;
        this.stopped = false;
        this.mcycle = 0;

    }
    get AF(){
        return (this.registers.A << 8) | (this.registers.F);
    }
    set AF(val){
        this.registers.A = val >> 8;
        this.registers.F = val & 0xF0; // flagu should remain 0 for low nibble
    }
    get BC(){
        return (this.registers.B << 8) | (this.registers.C);
    }
    set BC(val){
        this.registers.B = val >> 8;
        this.registers.C = val & 0xFF;
    }
    get DE(){
        return (this.registers.D << 8) | (this.registers.E);
    }
    set DE(val){
        this.registers.D = val >> 8;
        this.registers.E = val & 0xFF;
    }  
    get HL(){
        return (this.registers.H << 8) | (this.registers.L);
    }
    set HL(val){
        this.registers.H = val >> 8;
        this.registers.L = val & 0xFF;
    }         
    get ZFLAG(){
        return (this.registers.F & 128)>>7;
    }
    set ZFLAG(val){ // 1 or 0 
        this.registers.F = this.registers.F & 0b01110000 | (val << 7);
    }
    get NFLAG(){
        return (this.registers.F & 64)>>6;
    }
    set NFLAG(val){
        this.registers.F = this.registers.F & 0b10110000 | (val << 6);
    } 
    get HFLAG(){
        return (this.registers.F & 32)>>5;
    }
    set HFLAG(val){
        this.registers.F = this.registers.F & 0b11010000 | (val << 5);
    }
    get CFLAG(){
        return (this.registers.F & 16)>>4;
    }
    set CFLAG(val){
        this.registers.F = this.registers.F & 0b11100000 | (val << 4);
    }        

    reset(){
        this.AF = 0x0000;
        this.BC = 0x0000;
        this.DE = 0x0000;
        this.HL = 0x0000;

        this.PC = 0x0000;
        this.SP = 0xFFFE;
        this.IME = false;
        this.stopped = false;
        this.mcycle = 0;

        this.extracycle = 0; // actually wait until it hits and reset to 0 when finished instruction
      
    }
    _8bitadd(a,b){
        let res = a+b;
        if(b<0){
            this.NFLAG = 1;
            if(((a&0xF)+(b&0xF))<0){ 
                this.HFLAG = 1;
            }else{
                this.HFLAG = 0;
            }
        } 
        else{
            this.NFLAG = 0; 
            if(((a&0xF)+(b&0xF))>0xF){ 
                this.HFLAG = 1;
            }else{
                this.HFLAG = 0;
            }
        } 
            
           
        
        if(res==0) this.ZFLAG = 1;
        else this.ZFLAG = 0;


        if(res<0||res>0xFF){
            this.CFLAG = 1;
            
        }
        else this.CFLAG = 0;

        return (res)&0xFF;
    }
    _16bitadd(a,b){
        let res = a+b;
        this.NFLAG = 0;
    
            if(((a&0xFFF)+(b&0xFFF))>0xFFF){ 
                this.HFLAG = 1;
            }else{
                this.HFLAG = 0;
            }
           if(res>0xFFFF){ 
                this.CFLAG = 1;
            }else{
                this.CFLAG = 0;
            }           
        return res&0xFFFF;

    }
    cyclerun(){ //save individual flags when uhh weird stuff yea
        // DO SEPARATE CLOCK ACT WHEN MESSING WITH MEMORY(for ppu's)
        // especially when writing
        if(this.stopped) return;
        this.mcycle++;
        this.extracycle++;
        let byte1 = this.memory.readByte(this.PC);
        let byte2 = this.memory.readByte(this.PC+1);
        let byte3 = this.memory.readByte(this.PC+2);
        let HN1 = byte1 >> 4; // high nibble
        let LN1 = byte1 & 0x0F; // low nibble
        switch(HN1){

            case 0x00:
                switch(LN1){
                    case 0x00: // NOP
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x01: // LD BC, n16
                        if(this.extracycle==3){ 
                            this.BC = byte2 | (byte3 << 8);
                            this.extracycle = 0;
                            this.PC+=3;
                        }
                    break;
                    case 0x02: // LD [BC], A
                        if(this.extracycle==2){
                            this.memory.writeByte(this.BC, this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x03: // INC BC
                        if(this.extracycle==2){
                            this.BC = (this.BC+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                     case 0x04: // INC B
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.B = this._8bitadd(this.registers.B,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC B
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.B = this._8bitadd(this.registers.B,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break; 
                    case 0x06: // LD B, n8
                        if(this.extracycle==2){
                        
                            this.registers.B = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x07: // RLCA
                        if(this.extracycle==1){
                            this.ZFLAG = 0;
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = this.registers.A>>7;
                            this.registers.A = ((this.registers.A << 1) | this.CFLAG)&0xFF;
                        
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break; // look after this
                    case 0x08: // LD [a16], SP
                        if(this.extracycle==5){

                            this.memory.writeByte(byte2,this.SP&0xFF);
                        
                            this.extracycle = 0;
                            this.PC+=3;
                        }else if(this.extracycle==4){
                            this.memory.writeByte(byte3,this.SP>>8);

                        }
                    break;   
                    case 0x09: // ADD HL,BC
                        if(this.extracycle==2){

                            this.HL = this._16bitadd(this.HL,this.BC);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0A: // LD A, [BC]
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(this.BC);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0B: // DEC BC
                        if(this.extracycle==2){
                            this.BC = (this.BC-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0C: // INC C
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.C = this._8bitadd(this.registers.C,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC C
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.C = this._8bitadd(this.registers.C,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0E: // LD C, n8
                        if(this.extracycle==2){
                        
                            this.registers.C = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x0F: // RRCA
                        if(this.extracycle==1){
                            this.ZFLAG = 0;
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = this.registers.A&1;
                            this.registers.A = ((this.registers.A >> 1) | (this.CFLAG<<7));
                        
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;                                                                                                                                                                                                                                                                                                         
                }

                break;
            case 0x01:
                switch(LN1){
                    case 0x00: // STOP n8
                        if(this.extracycle==1){ // fill later
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x01: // LD DE, n16
                        if(this.extracycle==3){
                            this.DE = byte2 | (byte3 << 8);
                            this.extracycle = 0;
                            this.PC+=3;
                        }
                    break;
                    case 0x02: // LD [DE], A
                        if(this.extracycle==2){
                            this.memory.writeByte(this.DE, this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x03: // INC DE
                        if(this.extracycle==2){
                            this.DE = (this.DE+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                     case 0x04: // INC D
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.D = this._8bitadd(this.registers.D,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC D
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.D = this._8bitadd(this.registers.D,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break; 
                    case 0x06: // LD D, n8
                        if(this.extracycle==2){
                        
                            this.registers.D = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x07: // RLA
                        if(this.extracycle==1){
                            this.ZFLAG = 0;
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            let cs = this.CFLAG;
                            this.CFLAG = this.registers.A>>7;
                            this.registers.A = ((this.registers.A << 1) | cs)&0xFF;
                        
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x08: // JR e8
                        if(this.extracycle==3){
                            
                            
                            pos = (128 + byte2)&255-128;
                            this.extracycle = 0;
                            this.PC= this.PC + 2 + pos;
                        }
                    break;   
                    case 0x09: // ADD HL,DE
                        if(this.extracycle==2){

                            this.HL = this._16bitadd(this.HL,this.DE);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0A: // LD A, [DE]
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(this.DE);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0B: // DEC DE
                        if(this.extracycle==2){
                            this.DE = (this.DE-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0C: // INC E
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.E = this._8bitadd(this.registers.E,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC E
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.E = this._8bitadd(this.registers.E,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0E: // LD E, n8
                        if(this.extracycle==2){
                        
                            this.registers.E = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x0F: // RRA
                        if(this.extracycle==1){
                            this.ZFLAG = 0;
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            let cs = this.CFLAG;
                            this.CFLAG = this.registers.A&1;
                            this.registers.A = ((this.registers.A >> 1) | (this.cs<<7));
                        
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;                      
                }

                break;
            case 0x02:
                switch(LN1){
                    case 0x00: // JR NZ, e8
                        if(this.ZFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC+=2;
                        }   

                        }else{
                        if(this.extracycle==3){
                            pos = (128 + byte2)&255-128;
                            this.extracycle = 0;
                            this.PC= this.PC + 2 + pos;
                        }   


                        }
 
                    break;
                    case 0x01: // LD HL, n16
                        if(this.extracycle==3){
                            this.HL = byte2 | (byte3 << 8);
                            this.extracycle = 0;
                            this.PC+=3;
                        }
                    break;
                    case 0x02: // LD [HL+], A
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.A);
                            this.HL = (this.HL+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    
                    case 0x03: // INC HL
                        if(this.extracycle==2){
                            this.HL = (this.HL+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                     case 0x04: // INC H
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.H = this._8bitadd(this.registers.H,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC H
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.H = this._8bitadd(this.registers.H,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break; 
                    case 0x06: // LD H, n8
                        if(this.extracycle==2){
                        
                            this.registers.H = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x07: // DAA
                        if(this.extracycle==1){
                            let adj = 0;
                            if(this.NFLAG){
                                if(this.HFLAG) adj+= 0x6;
                                if(this.CFLAG) adj+= 0x60;
                                
                                //if(this.registers.A<adj) this.CFLAG = 1;
                                this.registers.A = (this.registers.A-adj)&0xFFFF;
                            }else{
                                if(this.HFLAG||this.registers.A&0xF>0x9) adj+= 0x6;
                                if(this.CFLAG||this.registers.A>0x99){
                                    this.CFLAG = 1;
                                    adj+= 0x60;
                                }
                                this.registers.A+=adj;
                                if(this.registers.A>0xFF){
                                    this.registers.A = this.registers.A&0xFFFF;
                                    //this.CFLAG = 1;
                                }
                            }
                            if(this.registers.A==0) this.ZFLAG = 0;
                            
                            this.HFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x08: // JR Z, e8
                        if(!this.ZFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC+=2;
                        }   

                        }else{
                        if(this.extracycle==3){
                            pos = (128 + byte2)&255-128;
                            this.extracycle = 0;
                            this.PC= this.PC + 2 + pos;
                        }   


                        }
                    break;   
                    case 0x09: // ADD HL,HL
                        if(this.extracycle==2){

                            this.HL = this._16bitadd(this.HL,this.HL);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0A: // LD A, [HL+]
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(this.HL);
                            this.HL = (this.HL+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0B: // DEC HL
                        if(this.extracycle==2){
                            this.HL = (this.HL-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0C: // INC L
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.L = this._8bitadd(this.registers.L,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC L
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.L = this._8bitadd(this.registers.L,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0E: // LD L, n8
                        if(this.extracycle==2){
                        
                            this.registers.L = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x0F: // CPL
                        if(this.extracycle==1){
                          
                            this.NFLAG = 1;
                            this.HFLAG = 1;
  
                            this.registers.A = ~this.registers.A&0xFF;
                        
                            this.PC++;
                        }
                    break;                      
                }

                break;
            case 0x03:
                switch(LN1){
                    case 0x00: // JR NC, e8
                        if(this.CFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC+=2;
                        }   

                        }else{
                        if(this.extracycle==3){
                            pos = (128 + byte2)&255-128;
                            this.extracycle = 0;
                            this.PC= this.PC + 2 + pos;
                        }   


                        }
 
                    break;
                    case 0x01: // LD SP, n16
                        if(this.extracycle==3){
                            this.SP = byte2 | (byte3 << 8);
                            this.extracycle = 0;
                            this.PC+=3;
                        }
                    break;
                    case 0x02: // LD [HL-], A
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.A);
                            this.HL = (this.HL-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    
                    case 0x03: // INC SP
                        if(this.extracycle==2){
                            this.SP = (this.SP+1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                     case 0x04: // INC [HL]
                        if(this.extracycle==3){
                            let cs = this.CFLAG;
                            this.memory.writeByte(this.HL,this._8bitadd(this.memory.readByte(this.HL),1));
                            
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC [HL]
                        if(this.extracycle==3){
                            let cs = this.CFLAG;
                            this.memory.writeByte(this.HL,this._8bitadd(this.memory.readByte(this.HL),-1));
                            
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break; 
                    case 0x06: // LD [HL], n8
                        if(this.extracycle==3){
                        
                            this.memory.writeByte(this.HL,byte2);
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x07: // SCF
                        if(this.extracycle==1){
                            this.CFLAG = 1;
                            this.HFLAG = 0;
                            this.NFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x08: // JR C, e8
                        if(!this.CFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC+=2;
                        }   

                        }else{
                        if(this.extracycle==3){
                            pos = (128 + byte2)&255-128;
                            this.extracycle = 0;
                            this.PC= this.PC + 2 + pos;
                        }   


                        }
                    break;   
                    case 0x09: // ADD HL,SP
                        if(this.extracycle==2){

                            this.HL = this._16bitadd(this.HL,this.SP);
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0A: // LD A, [HL-]
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(this.HL);
                            this.HL = (this.HL-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0B: // DEC SP
                        if(this.extracycle==2){
                            this.SP = (this.SP-1)&0xFFFF;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0C: // INC A
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.A = this._8bitadd(this.registers.A,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC A
                        if(this.extracycle==1){
                            let cs = this.CFLAG;
                            this.registers.A = this._8bitadd(this.registers.A,-1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0E: // LD A, n8
                        if(this.extracycle==2){
                        
                            this.registers.A = byte2;
                        
                            this.extracycle = 0;
                            this.PC+=2;
                        }
                    break;
                    case 0x0F: // CCF
                        if(this.extracycle==1){
                          
                            this.NFLAG = 0;
                            this.HFLAG = 0;
  
                            this.CFLAG = Math.abs(this.CFLAG-1);
                        
                            this.PC++;
                        }
                    break;                      
                }

                break;                
        }
    }


    
}