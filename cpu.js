import {gabememory} from './memory.js';
const inturruptjumptable = new Uint8Array(0x11);
inturruptjumptable[0x01] = 0x40;
inturruptjumptable[0x02] = 0x48;
inturruptjumptable[0x04] = 0x50;
inturruptjumptable[0x08] = 0x58;
inturruptjumptable[0x10] = 0x60;
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
        this.ishalted = false;
        this.haltfail = false;
        this.currentinturrupt = 0;
        
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
        this.ishalted = false;
        this.haltfail = false;
        this.currentinturrupt = 0;
        this.mcycle = 0;

        this.extracycle = 0; // actually wait until it hits and reset to 0 when finished instruction
      
    }
    checkinturrupt(){
        return this.memory.readByte(0xFFFF)&this.memory.readByte(0xFF0F);
    }
    checkbtn(){
        if(this.memory.readByte(0xFF00)&0x30!=0x30){
            return (~this.memory.readByte(0xFF00))&0x0F;
        }
        return 0;
    }    
    _8bitadd(a,b,carry = false){
        this.NFLAG = 0; 
        const carries = carry ? this.CFLAG : 0;
        const res = a+b+carries;

        
            
            if(((a&0xF)+(b&0xF)+carries)>0xF){ 
                this.HFLAG = 1;
            }else{
                this.HFLAG = 0;
            }
        
            


       

           
        
        if(res==0) this.ZFLAG = 1;
        else this.ZFLAG = 0;


        if(res>0xFF) this.CFLAG = 1;
        else this.CFLAG = 0;

        return res&0xFF;
    }
   _8bitsub(a,b,carry = false){ // a-b-carry (optional)
        this.NFLAG = 1; 
        const carries = carry ? this.CFLAG : 0;
        const res = a-b-carries;

        
            
            if(((a&0xF)-(b&0xF)-carries)<0){ 
                this.HFLAG = 1;
            }else{
                this.HFLAG = 0;
            }
        
            


       

           
        
        if(res==0) this.ZFLAG = 1;
        else this.ZFLAG = 0;


        if(res<0) this.CFLAG = 1;
        else this.CFLAG = 0;

        return res&0xFF;
    }    
    _16bitadd(a,b){
        const res = a+b;
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
        this.mcycle++;
        if(this.stopped){
            if(this.checkbtn()){
                this.stopped = false;

            }else return; 
           
        } 
        if(this.ishalted){
            if(this.checkinturrupt()){
                if(this.IME){
                    this.ishalted = false;
                    let bos = 0;
                    for(let i=1;i<=0x10;i = i<<1){
                        if(this.checkinturrupt()&i){
                            bos = i;
                            break;
                        }
                    }
                    this.currentinturrupt = bos;
                    
                }else{
                    this.ishalted = false;
                }
            }else{
                return;
            }
        }
        
        
        this.extracycle++;
        if(this.IME){
            if(this.currentinturrupt){
                if(this.extracycle==5){
                    this.IME = false;
                    this.PC = this.inturruptjumptable[this.currentinturrupt];
                    this.currentinturrupt = 0;
                }else if(this.extracycle==1){
                    this.memory.writeByte(this.SP-1,this.PC>>8);
                }else if(this.extracycle==2){
                    this.memory.writeByte(this.SP-2,this.PC&0xFF);
                    this.SP-=2;
                }
            }else if(this.extracycle==1&&this.checkinturrupt()){
                    let bos = 0;
                    for(let i=1;i<=0x10;i = i<<1){
                        if(this.checkinturrupt()&i){
                            bos = i;
                            break;
                        }
                    }
                    this.currentinturrupt = bos;
                    return;
            }
        }
        const byte1 = this.memory.readByte(this.PC);

        let byte2 = this.memory.readByte(this.PC+1);
  
        const byte3 = this.memory.readByte(this.PC+2);
        if(this.haltfail){
            this.byte2 = byte1;
            this.byte3 = byte2;
            this.PC--;
            this.haltfail = false;
        }              
        const HN1 = byte1 >> 4; // high nibble
        const LN1 = byte1 & 0x0F; // low nibble
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
                            const cs = this.CFLAG;
                            this.registers.B = this._8bitadd(this.registers.B,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC B
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.B = this._8bitsub(this.registers.B,1);
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
                            const adr = (byte3 << 8) | byte2;
                            this.memory.writeByte(adr+1,this.SP>>8);
                        
                            this.extracycle = 0;
                            this.PC+=3;
                        }else if(this.extracycle==4){
                            const adr = (byte3 << 8) | byte2;
                            this.memory.writeByte(adr,this.SP&0xFF);

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
                            const cs = this.CFLAG;
                            this.registers.C = this._8bitadd(this.registers.C,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC C
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.C = this._8bitsub(this.registers.C,1);
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
                            if(this.checkbtn()){
                                if(!this.checkinturrupt()){
                                    this.PC++;
                                    this.ishalted = true;
                                }
                            }else{
                                if(!this.checkinturrupt())this.PC++;
                                this.stopped = true;
                                this.writeByte(0xFF04,0);
                            }
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
                            const cs = this.CFLAG;
                            this.registers.D = this._8bitadd(this.registers.D,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC D
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.D = this._8bitsub(this.registers.D,1);
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
                            const cs = this.CFLAG;
                            this.CFLAG = this.registers.A>>7;
                            this.registers.A = ((this.registers.A << 1) | cs)&0xFF;
                        
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x08: // JR e8
                        if(this.extracycle==3){
                            
                            
                            const pos = (128 + byte2)&255-128;
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
                            const cs = this.CFLAG;
                            this.registers.E = this._8bitadd(this.registers.E,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC E
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.E = this._8bitsub(this.registers.E,1);
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
                            const cs = this.CFLAG;
                            this.CFLAG = this.registers.A&1;
                            this.registers.A = ((this.registers.A >> 1) | (cs<<7));
                        
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
                            const pos = (128 + byte2)&255-128;
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
                            const cs = this.CFLAG;
                            this.registers.H = this._8bitadd(this.registers.H,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC H
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.H = this._8bitsub(this.registers.H,1);
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
                            const pos = (128 + byte2)&255-128;
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
                            const cs = this.CFLAG;
                            this.registers.L = this._8bitadd(this.registers.L,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC L
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.L = this._8bitsub(this.registers.L,1);
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
                            const pos = (128 + byte2)&255-128;
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
                            const cs = this.CFLAG;
                            this.memory.writeByte(this.HL,this._8bitadd(this.memory.readByte(this.HL),1));
                            
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x05: // DEC [HL]
                        if(this.extracycle==3){
                            const cs = this.CFLAG;
                            this.memory.writeByte(this.HL,this._8bitsub(this.memory.readByte(this.HL),1));
                            
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
                            const pos = (128 + byte2)&255-128;
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
                            const cs = this.CFLAG;
                            this.registers.A = this._8bitadd(this.registers.A,1);
                            this.CFLAG = cs;
                            this.extracycle = 0;
                            this.PC++;
                        }
                    break;
                    case 0x0D: // DEC A
                        if(this.extracycle==1){
                            const cs = this.CFLAG;
                            this.registers.A = this._8bitsub(this.registers.A,1);
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
                
            case 0x04:
                switch(LN1){
                    case 0x00: // LD B,B                     
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x01: // LD B,C                     
                        if(this.extracycle==1){
                            this.registers.B = this.registers.C;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x02: // LD B,D                    
                        if(this.extracycle==1){
                            this.registers.B = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x03: // LD B,E                     
                        if(this.extracycle==1){
                            this.registers.B = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x04: // LD B,H                    
                        if(this.extracycle==1){
                            this.registers.B = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // LD B,L                    
                        if(this.extracycle==1){
                            this.registers.B = this.registers.L;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x06: // LD B,[HL]                   
                        if(this.extracycle==2){
                            this.registers.B = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x07: // LD B,A                    
                        if(this.extracycle==1){
                            this.registers.B = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x08: // LD C,B                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.B;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // LD C,C                   
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // LD C,D                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0B: // LD C,E                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0C: // LD C,H                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // LD C,L                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.L;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0E: // LD C,[HL]                   
                        if(this.extracycle==2){
                            this.registers.C = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x0F: // LD C,A                    
                        if(this.extracycle==1){
                            this.registers.C = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;                
            case 0x05:
                switch(LN1){
                    case 0x00: // LD D,B                     
                        if(this.extracycle==1){
                            this.registers.D = this.registers.B;
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x01: // LD D,C                     
                        if(this.extracycle==1){
                            this.registers.D = this.registers.C;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x02: // LD D,D                    
                        if(this.extracycle==1){
                           

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x03: // LD D,E                     
                        if(this.extracycle==1){
                            this.registers.D = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x04: // LD D,H                    
                        if(this.extracycle==1){
                            this.registers.D = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // LD D,L                    
                        if(this.extracycle==1){
                            this.registers.D = this.registers.L;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x06: // LD D,[HL]                   
                        if(this.extracycle==2){
                            this.registers.D = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x07: // LD D,A                    
                        if(this.extracycle==1){
                            this.registers.D = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x08: // LD E,B                    
                        if(this.extracycle==1){
                            this.registers.E = this.registers.B;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // LD E,C                   
                        if(this.extracycle==1){
                            this.registers.E = this.registers.C;
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // LD E,D                    
                        if(this.extracycle==1){
                            this.registers.E = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0B: // LD E,E                    
                        if(this.extracycle==1){
                           

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0C: // LD E,H                    
                        if(this.extracycle==1){
                            this.registers.E = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // LD E,L                    
                        if(this.extracycle==1){
                            this.registers.E = this.registers.L;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0E: // LD E,[HL]                   
                        if(this.extracycle==2){
                            this.registers.E = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x0F: // LD E,A                    
                        if(this.extracycle==1){
                            this.registers.E = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x06:
                switch(LN1){
                    case 0x00: // LD H,B                     
                        if(this.extracycle==1){
                            this.registers.H = this.registers.B;
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x01: // LD H,C                     
                        if(this.extracycle==1){
                            this.registers.H = this.registers.C;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x02: // LD H,D                    
                        if(this.extracycle==1){
                           this.registers.H = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x03: // LD H,E                     
                        if(this.extracycle==1){
                            this.registers.H = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x04: // LD H,H WHAT                
                        if(this.extracycle==1){

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // LD H,L                    
                        if(this.extracycle==1){
                            this.registers.H = this.registers.L;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x06: // LD H,[HL]                   
                        if(this.extracycle==2){
                            this.registers.H = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x07: // LD H,A                    
                        if(this.extracycle==1){
                            this.registers.H = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x08: // LD L,B                    
                        if(this.extracycle==1){
                            this.registers.L = this.registers.B;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // LD L,C                   
                        if(this.extracycle==1){
                            this.registers.L = this.registers.C;
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // LD L,D                    
                        if(this.extracycle==1){
                            this.registers.L = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0B: // LD L,E                    
                        if(this.extracycle==1){
                            this.registers.L = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0C: // LD L,H                    
                        if(this.extracycle==1){
                            this.registers.L = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // LD L,L                    
                        if(this.extracycle==1){



                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0E: // LD L,[HL]                   
                        if(this.extracycle==2){
                            this.registers.L = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x0F: // LD L,A                    
                        if(this.extracycle==1){
                            this.registers.L = this.registers.A;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x07:
                switch(LN1){
                    case 0x00: // LD [HL],B                     
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.B);
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x01: // LD [HL],C                     
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.C);
                            this.extracycle = 0;
                            this.PC++;
                        }        
                    break;
                    case 0x02: // LD [HL],D                    
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.D);
                            this.extracycle = 0;
                            this.PC++;
                        }         
                    break;
                    case 0x03: // LD [HL],E                     
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.E);
                            this.extracycle = 0;
                            this.PC++;
                        }             
                    break;
                    case 0x04: // LD [HL],H                
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.H);
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // LD [HL],L                    
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.L);
                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break;
                    case 0x06: // HALT                  
                        if(this.extracycle==1){
                            if(!this.IME&&this.checkinturrupt()){
                                this.haltfail = true;
                            }
                            else this.ishalted = true;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x07: // LD [HL],A                    
                        if(this.extracycle==2){
                            this.memory.writeByte(this.HL, this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }              
                    break;
                    case 0x08: // LD A,B                    
                        if(this.extracycle==1){
                            this.registers.A = this.registers.B;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // LD A,C                   
                        if(this.extracycle==1){
                            this.registers.A = this.registers.C;
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // LD A,D                    
                        if(this.extracycle==1){
                            this.registers.A = this.registers.D;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0B: // LD A,E                    
                        if(this.extracycle==1){
                            this.registers.A = this.registers.E;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0C: // LD A,H                    
                        if(this.extracycle==1){
                            this.registers.A = this.registers.H;

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // LD A,L                    
                        if(this.extracycle==1){
                            this.registers.A = this.registers.L;


                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0E: // LD A,[HL]                   
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(this.HL);

                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x0F: // LD A,A                    
                        if(this.extracycle==1){


                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x08:
                switch(LN1){
                    case 0x00: // ADD A,B                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.B);
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x01: // ADD A,C                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.C);
                            this.extracycle = 0;
                            this.PC++;
                        }        
                    break;
                    case 0x02: // ADD A,D                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.D);
                            this.extracycle = 0;
                            this.PC++;
                        }          
                    break;
                    case 0x03: // ADD A,E                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.E);
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x04: // ADD A,H                
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.H);
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // ADD A,L                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.L);
                            this.extracycle = 0;
                            this.PC++;
                        }               
                    break;
                    case 0x06: // ADD A,[HL]                  
                        if(this.extracycle==2){
                            this.registers.A = this._8bitadd(this.registers.A,this.memory.readByte(this.HL));
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x07: // ADD A,A                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }              
                    break;
                    case 0x08: // ADC A,B                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.B,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // ADC A,C                   
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.C,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // ADC A,D                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.D,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break; 
                    case 0x0B: // ADC A,E                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.E,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                  
                    break; 
                    case 0x0C: // ADC A,H                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.H,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // ADC A,L                   
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.L,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }         
                    break; 
                    case 0x0E: // ADC A,[HL]                
                        if(this.extracycle==2){
                            this.registers.A = this._8bitadd(this.registers.A,this.memory.readByte(this.HL),true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                   
                    break;
                    case 0x0F: // ADC A,A                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitadd(this.registers.A,this.registers.A,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x09:
                switch(LN1){
                    case 0x00: // SUB A,B                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.B);
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x01: // SUB A,C                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.C);
                            this.extracycle = 0;
                            this.PC++;
                        }        
                    break;
                    case 0x02: // SUB A,D                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.D);
                            this.extracycle = 0;
                            this.PC++;
                        }          
                    break;
                    case 0x03: // SUB A,E                     
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.E);
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x04: // SUB A,H                
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.H);
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;
                    case 0x05: // SUB A,L                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.L);
                            this.extracycle = 0;
                            this.PC++;
                        }               
                    break;
                    case 0x06: // SUB A,[HL]                  
                        if(this.extracycle==2){
                            this.registers.A = this._8bitsub(this.registers.A,this.memory.readByte(this.HL));
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x07: // SUB A,A                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }              
                    break;
                    case 0x08: // SBC A,B                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.B,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x09: // SBC A,C                   
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.C,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0A: // SBC A,D                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.D,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break; 
                    case 0x0B: // SBC A,E                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.E,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                  
                    break; 
                    case 0x0C: // SBC A,H                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.H,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // SBC A,L                   
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.L,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }         
                    break; 
                    case 0x0E: // SBC A,[HL]                
                        if(this.extracycle==2){
                            this.registers.A = this._8bitsub(this.registers.A,this.memory.readByte(this.HL),true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                   
                    break;
                    case 0x0F: // SBC A,A                    
                        if(this.extracycle==1){
                            this.registers.A = this._8bitsub(this.registers.A,this.registers.A,true);
                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x0A:
                switch(LN1){
                    case 0x00: // AND A,B                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.B;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x01: // AND A,C                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.C;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x02: // AND A,D                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.D;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x03: // AND A,E                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.E;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x04: // AND A,H                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.H;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x05: // AND A,L                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&this.registers.L;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x06: // AND A,[HL]                  
                        if(this.extracycle==2){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;                            
                            this.registers.A = this.registers.A&this.memory.readByte(this.HL);
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;                            
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x07: // AND A,A                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;        
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;    
                            this.extracycle = 0;
                            this.PC++;
                        }              
                    break;
                    case 0x08: // XOR A,B                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.B;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }                     
                    break; 
                    case 0x09: // XOR A,C                   
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.C;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }                     
                    break; 
                    case 0x0A: // XOR A,D                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.D;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break; 
                    case 0x0B: // XOR A,E                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.E;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }                      
                    break; 
                    case 0x0C: // XOR A,H                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.H;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }                    
                    break; 
                    case 0x0D: // XOR A,L                   
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^this.registers.L;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0E: // XOR A,[HL]                
                        if(this.extracycle==2){                    
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            this.registers.A = this.registers.A^this.memory.readByte(this.HL);
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;
                            this.extracycle = 0;
                            this.PC++;
                             
                        }                   
                    break;
                    case 0x0F: // XOR A,A                    
                        if(this.extracycle==1){
                            this.registers.A = 0;
                            this.ZFLAG = 1;
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;
            case 0x0B:
                switch(LN1){
                    case 0x00: // OR A,B                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.B;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x01: // OR A,C                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.C;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x02: // OR A,D                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.D;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x03: // OR A,E                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.E;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x04: // OR A,H                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.H;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x05: // OR A,L                     
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|this.registers.L;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;

                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x06: // OR A,[HL]                  
                        if(this.extracycle==2){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;                            
                            this.registers.A = this.registers.A|this.memory.readByte(this.HL);
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;                            
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x07: // OR A,A                    
                        if(this.extracycle==1){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;        
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;    
                            this.extracycle = 0;
                            this.PC++;
                        }              
                    break;
                    case 0x08: // CP A,B   compare using sub and store flags                
                        if(this.extracycle==1){               
                            this._8bitsub(this.registers.A,this.registers.B);
                            this.extracycle = 0;
                            this.PC++;
                        }                     
                    break; 
                    case 0x09: // CP A,C              
                        if(this.extracycle==1){                    
                            this._8bitsub(this.registers.A,this.registers.C);
                            this.extracycle = 0;
                            this.PC++;
                        }                     
                    break;  
                    case 0x0A: // CP A,D                    
                        if(this.extracycle==1){
                            this._8bitsub(this.registers.A,this.registers.D);
                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break; 
                    case 0x0B: // CP A,E                    
                        if(this.extracycle==1){
                            this._8bitsub(this.registers.A,this.registers.E);
                            this.extracycle = 0;
                            this.PC++;
                        }                
                    break; 
                    case 0x0C: // CP A,H                    
                        if(this.extracycle==1){
                            this._8bitsub(this.registers.A,this.registers.H);
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break; 
                    case 0x0D: // CP A,L                   
                        if(this.extracycle==1){
                            this._8bitsub(this.registers.A,this.registers.L);
                            this.extracycle = 0;
                            this.PC++;
                        }     
                    break; 
                    case 0x0E: // CP A,[HL]                
                        if(this.extracycle==2){
                            this._8bitsub(this.registers.A,this.memory.readByte(this.HL));
                            this.extracycle = 0;
                            this.PC++;
                        }               
                    break;
                    case 0x0F: // CP A,A                    
                        if(this.extracycle==1){
                            this.ZFLAG = 1;
                            this.NFLAG = 1;
                            this.HFLAG = 0;
                            this.CFLAG = 0;                            
                            this.extracycle = 0;
                            this.PC++;
                        }                 
                    break;                      
                }

                break;       
                
                // k eep going
            case 0x0C:
                switch(LN1){
                    case 0x00: // RET NZ
                    if(this.ZFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    }else{
                        if(this.extracycle==5){
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }    

                    }              
  
                    break;
                    case 0x01: // POP BC                  
                        if(this.extracycle==3){
                            this.registers.B = this.memory.readByte(this.SP+1);
                            this.registers.C = this.memory.readByte(this.SP);
                            this.SP+=2;
                            this.extracycle = 0;
                            this.PC++;
                        }            
                    break;
                    case 0x02: // JP NZ, a16
                    
                    if(this.ZFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==4){
                            this.PC = (byte3<<8) | byte2;
                            this.extracycle = 0;
                        }    

                    }              
                    break;             
                    case 0x03: // JP a16                   
                        if(this.extracycle==4){
                            this.PC = (byte3<<8) | byte2;
                            this.extracycle = 0;
                        }            
                    break;
                    case 0x04: // CALL NZ a16                  
                    if(this.ZFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==6){ //watch closely
                            const target = (this.PC+3)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = (byte3<<8) | byte2;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==5){
                            const target = (this.PC+3)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }       

                    }            
                    break;
                    case 0x05: // PUSH BC                     
                        if(this.extracycle==4){ // this also
                            
                            
                            this.memory.writeByte(this.SP-2,this.registers.C);
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
   
                            this.memory.writeByte(this.SP-1,this.registers.B);
                        }            
                    break;
                    case 0x06: // ADD A,n8                  
                        if(this.extracycle==2){
                           
                            this.registers.A = this._8bitadd(this.registers.A,byte2);
  
                     
                            this.extracycle = 0;
                            this.PC+=2;
                        }            
                    break;
                    
                    case 0x07: // RST $00                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0000;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;
                    case 0x08: // RET Z       
                    if(!this.ZFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    }else{
                        if(this.extracycle==5){
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }    

                    }                         
                    break; 
                    case 0x09: // RET              
                        if(this.extracycle==4){
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }                       
                    break;  
                    case 0x0A:// JP Z ,a16                 
                    if(!this.ZFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==4){
                            this.PC = (byte3<<8) | byte2;
                            this.extracycle = 0;
                        }    

                    }                
                    break; 
                    case 0x0B: // PREFIX                
                        //forgive me god for doing this again
                        const HN2 = byte2 >> 4;
                        const LN2 = byte2 & 0xF;
                        switch(HN2){
                            case 0x00:
                                switch(LN2){
                                    case 0x00://RLC B
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.B>>7;
                                            this.registers.B = ((this.registers.B << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RLC C
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.C>>7;
                                            this.registers.C = ((this.registers.C << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://RLC D
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.D>>7;
                                            this.registers.D = ((this.registers.D << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x03://RLC E
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.E>>7;
                                            this.registers.E = ((this.registers.E << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x04://RLC H
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.H>>7;
                                            this.registers.H = ((this.registers.H << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://RLC L
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.L>>7;
                                            this.registers.L = ((this.registers.L << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://RLC [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = rawdata>>7;
                                            rawdata = ((rawdata << 1) | this.CFLAG)&0xFF;
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x07://RLC A
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.A>>7;
                                            this.registers.A = ((this.registers.A << 1) | this.CFLAG)&0xFF;
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://RRC B
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.B&1;
                                            this.registers.B = ((this.registers.B >> 1) | (this.CFLAG<<7));
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RRC C
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.C&1;
                                            this.registers.C = ((this.registers.C >> 1) | (this.CFLAG<<7));
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RRC D
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.D&1;
                                            this.registers.D = ((this.registers.D >> 1) | (this.CFLAG<<7));
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://RRC E
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.E&1;
                                            this.registers.E = ((this.registers.E >> 1) | (this.CFLAG<<7));
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0C://RRC H
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.H&1;
                                            this.registers.H = ((this.registers.H >> 1) | (this.CFLAG<<7));
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://RRC L
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.L&1;
                                            this.registers.L = ((this.registers.L >> 1) | (this.CFLAG<<7));
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://RRC [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = rawdata&1;
                                            rawdata = ((rawdata >> 1) | (this.CFLAG<<7));
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0F://RRC A
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.A&1;
                                            this.registers.A = ((this.registers.A >> 1) | (this.CFLAG<<7));
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                           
                                }
                            break;
                            case 0x01:
                                switch(LN2){
                                    case 0x00://RL B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.B>>7;
                                            this.registers.B = ((this.registers.B << 1) | cs)&0xFF;
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RL C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.C>>7;
                                            this.registers.C = ((this.registers.C << 1) | cs)&0xFF;
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }            
                                    break;
                                    case 0x02://RL D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.D>>7;
                                            this.registers.D = ((this.registers.D << 1) | cs)&0xFF;
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }          
                                    break;
                                    case 0x03://RL E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.E>>7;
                                            this.registers.E = ((this.registers.E << 1) | cs)&0xFF;
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x04://RL H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.H>>7;
                                            this.registers.H = ((this.registers.H << 1) | cs)&0xFF;
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://RL L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.L>>7;
                                            this.registers.L = ((this.registers.L << 1) | cs)&0xFF;
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://RL [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = rawdata>>7;
                                            rawdata = ((rawdata << 1) | cs)&0xFF;
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x07://RL A
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.A>>7;
                                            this.registers.A = ((this.registers.A << 1) | cs)&0xFF;
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://RR B
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.B&1;
                                            this.registers.B = ((this.registers.B >> 1) | (cs<<7));
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RR C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.C&1;
                                            this.registers.C = ((this.registers.C >> 1) | (cs<<7));
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RR D
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.D&1;
                                            this.registers.D = ((this.registers.D >> 1) | (cs<<7));
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://RR E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.E&1;
                                            this.registers.E = ((this.registers.E >> 1) | (cs<<7));
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }
                                    break;
                                    case 0x0C://RR H
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.H&1;
                                            this.registers.H = ((this.registers.H >> 1) | (cs<<7));
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://RR L
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.L&1;
                                            this.registers.L = ((this.registers.L >> 1) | (cs<<7));
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://RR [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = rawdata&1;
                                            rawdata = ((rawdata >> 1) | (cs<<7));
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0F://RR A
                                        if(this.extracycle==2){
                                            
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            const cs = this.CFLAG;
                                            this.CFLAG = this.registers.A&1;
                                            this.registers.A = ((this.registers.A >> 1) | (cs<<7));
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                           
                                }
                            break;                            
                            case 0x02:
                                switch(LN2){
                                    case 0x00://SLA B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.B>>7;
                                            this.registers.B = (this.registers.B << 1)&0xFF;
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SLA C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.C>>7;
                                            this.registers.C = (this.registers.C << 1)&0xFF;
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }              
                                    break;
                                    case 0x02://SLA D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.D>>7;
                                            this.registers.D = (this.registers.D << 1)&0xFF;
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }         
                                    break;
                                    case 0x03://SLA E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.E>>7;
                                            this.registers.E = (this.registers.E << 1)&0xFF;
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x04://SLA H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.H>>7;
                                            this.registers.H = (this.registers.H << 1)&0xFF;
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x05://SLA L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.L>>7;
                                            this.registers.L = (this.registers.L << 1)&0xFF;
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://SLA [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = rawdata>>7;
                                            rawdata = (rawdata << 1)&0xFF;
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x07://SLA A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.A>>7;
                                            this.registers.A = (this.registers.A << 1)&0xFF;
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }                    
                                    break;
                                    case 0x08://SRA B
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.B&1;
                                            this.registers.B = (this.registers.B&0x80)|(this.registers.B >> 1);
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SRA C
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.C&1;
                                            this.registers.C = (this.registers.C&0x80)|(this.registers.C >> 1);
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x0A://SRA D
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.D&1;
                                            this.registers.D = (this.registers.D&0x80)|(this.registers.D >> 1);
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }             
                                    break;
                                    case 0x0B://SRA E
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.E&1;
                                            this.registers.E = (this.registers.E&0x80)|(this.registers.E >> 1);
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }    
                                    break;
                                    case 0x0C://SRA H
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.H&1;
                                            this.registers.H = (this.registers.H&0x80)|(this.registers.H >> 1);
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x0D://SRA L
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.L&1;
                                            this.registers.L = (this.registers.L&0x80)|(this.registers.L >> 1);
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://SRA [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = rawdata&1;
                                            rawdata = (rawdata&0x80)|(rawdata >> 1);
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0F://SRA A
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.A&1;
                                            this.registers.A = (this.registers.A&0x80)|(this.registers.A >> 1);
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }             
                                    break;                                                                                                                                                           
                                }
                            break;
                            case 0x03:
                                switch(LN2){
                                    case 0x00://SWAP B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.B = ((this.registers.B <<4)&0xF0)|(this.registers.B >>4);
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SWAP C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.C = ((this.registers.C <<4)&0xF0)|(this.registers.C >>4);
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }              
                                    break;
                                    case 0x02://SWAP D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.D = ((this.registers.D <<4)&0xF0)|(this.registers.D >>4);
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }
                                    break;
                                    case 0x03://SWAP E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.E = ((this.registers.E <<4)&0xF0)|(this.registers.E >>4);
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x04://SWAP H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.H = ((this.registers.H <<4)&0xF0)|(this.registers.H >>4);
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x05://SWAP L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.L = ((this.registers.L <<4)&0xF0)|(this.registers.L >>4);
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://SWAP [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            rawdata = ((rawdata <<4)&0xF0)|(rawdata >>4);
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x07://SWAP A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = 0;
                                            this.registers.L = ((this.registers.L <<4)&0xF0)|(this.registers.L >>4);
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }                    
                                    break;
                                    case 0x08://SRL B
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.B&1;
                                            this.registers.B = this.registers.B >> 1;
                                            if(this.registers.B==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SRL C
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.C&1;
                                            this.registers.C = this.registers.C >> 1;
                                            if(this.registers.C==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x0A://SRL D
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.D&1;
                                            this.registers.D = this.registers.D >> 1;
                                            if(this.registers.D==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }             
                                    break;
                                    case 0x0B://SRL E
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.E&1;
                                            this.registers.E = this.registers.E >> 1;
                                            if(this.registers.E==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }    
                                    break;
                                    case 0x0C://SRL H
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.H&1;
                                            this.registers.H = this.registers.H >> 1;
                                            if(this.registers.H==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x0D://SRL L
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.L&1;
                                            this.registers.L = this.registers.L >> 1;
                                            if(this.registers.L==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://SRL [HL]
                                        if(this.extracycle==4){
                                            let rawdata = this.memory.readByte(this.HL);
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = rawdata&1;
                                            rawdata = rawdata >> 1;
                                            if(rawdata==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.memory.writeByte(this.HL,rawdata);
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0F://SRL A
                                        if(this.extracycle==2){                       
                                            this.NFLAG = 0;
                                            this.HFLAG = 0;
                                            this.CFLAG = this.registers.A&1;
                                            this.registers.A = this.registers.A >> 1;
                                            if(this.registers.A==0) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }             
                                    break;                                                                                                                                                           
                                }
                            break;
                            case 0x04:
                                switch(LN2){
                                    case 0x00://BIT 0, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://BIT 0, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://BIT 0, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x03://BIT 0, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x04://BIT 0, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://BIT 0, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://BIT 0, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://BIT 0, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&1) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://BIT 1, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://BIT 1, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://BIT 1, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://BIT 1, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0C://BIT 1, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://BIT 1, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://BIT 1, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://BIT 1, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&2) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                    
                                }
                            break;
                            case 0x05:
                                switch(LN2){
                                    case 0x00://BIT 2, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://BIT 2, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://BIT 2, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x03://BIT 2, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x04://BIT 2, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://BIT 2, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://BIT 2, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://BIT 2, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&4) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://BIT 3, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://BIT 3, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://BIT 3, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://BIT 3, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0C://BIT 3, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://BIT 3, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://BIT 3, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://BIT 3, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&8) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                    
                                }
                            break; 
                            case 0x06:
                                switch(LN2){
                                    case 0x00://BIT 4, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://BIT 4, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://BIT 4, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x03://BIT 4, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x04://BIT 4, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://BIT 4, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://BIT 4, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://BIT 4, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&16) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://BIT 5, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://BIT 5, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://BIT 5, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://BIT 5, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0C://BIT 5, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://BIT 5, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://BIT 5, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://BIT 5, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&32) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                    
                                }
                            break;                            
                            case 0x07:
                                switch(LN2){
                                    case 0x00://BIT 6, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://BIT 6, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://BIT 6, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x03://BIT 6, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x04://BIT 6, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x05://BIT 6, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x06://BIT 6, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://BIT 6, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&64) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x08://BIT 7, B
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.B&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://BIT 7, C
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.C&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://BIT 7, D
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.D&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0B://BIT 7, E
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.E&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0C://BIT 7, H
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.H&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0D://BIT 7, L
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.L&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0E://BIT 7, [HL]
                                        if(this.extracycle==3){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.memory.readByte(this.HL)&128) this.ZFLAG = 0; 
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://BIT 7, A
                                        if(this.extracycle==2){
                                            this.NFLAG = 0;
                                            this.HFLAG = 1;
                                            if(this.registers.A&128) this.ZFLAG = 0;
                                            else this.ZFLAG = 1;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                                                                                                                                    
                                }
                            break;  
                            case 0x08:
                                switch(LN2){
                                    case 0x00://RES 0, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RES 0, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://RES 0, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://RES 0, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://RES 0, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://RES 0, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://RES 0, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11111110));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://RES 0, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11111110;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://RES 1, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RES 1, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RES 1, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://RES 1, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://RES 1, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://RES 1, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://RES 1, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11111101));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://RES 1, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11111101;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;                            
                            case 0x09:
                                switch(LN2){
                                    case 0x00://RES 2, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RES 2, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://RES 2, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://RES 2, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://RES 2, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://RES 2, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://RES 2, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11111011));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://RES 2, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11111011;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://RES 3, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RES 3, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RES 3, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://RES 3, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://RES 3, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://RES 3, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://RES 3, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11110111));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://RES 3, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11110111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0A:
                                switch(LN2){
                                    case 0x00://RES 4, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RES 4, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://RES 4, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://RES 4, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://RES 4, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://RES 4, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://RES 4, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11101111));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://RES 4, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11101111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://RES 5, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RES 5, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RES 5, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://RES 5, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://RES 5, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://RES 5, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://RES 5, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b11011111));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://RES 5, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b11011111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0B:
                                switch(LN2){
                                    case 0x00://RES 6, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://RES 6, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://RES 6, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://RES 6, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://RES 6, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://RES 6, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://RES 6, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b10111111));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://RES 6, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b10111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://RES 7, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://RES 7, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://RES 7, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://RES 7, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://RES 7, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://RES 7, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://RES 7, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)& 0b01111111));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://RES 7, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A & 0b01111111;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0C:
                                switch(LN2){
                                    case 0x00://SET 0, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SET 0, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://SET 0, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://SET 0, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://SET 0, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://SET 0, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://SET 0, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00000001));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://SET 0, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00000001;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://SET 1, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SET 1, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://SET 1, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://SET 1, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://SET 1, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://SET 1, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://SET 1, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00000010));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://SET 1, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00000010;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0D:
                                switch(LN2){
                                    case 0x00://SET 2, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SET 2, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://SET 2, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://SET 2, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://SET 2, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://SET 2, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://SET 2, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00000100));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://SET 2, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00000100;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://SET 3, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SET 3, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://SET 3, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://SET 3, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://SET 3, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://SET 3, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://SET 3, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00001000));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://SET 3, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00001000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0E:
                                switch(LN2){
                                    case 0x00://SET 4, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SET 4, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://SET 4, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://SET 4, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://SET 4, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://SET 4, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://SET 4, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00010000));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://SET 4, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00010000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://SET 5, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SET 5, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://SET 5, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://SET 5, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://SET 5, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://SET 5, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://SET 5, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b00100000));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://SET 5, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b00100000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;
                            case 0x0F:
                                switch(LN2){
                                    case 0x00://SET 6, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x01://SET 6, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x02://SET 6, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x03://SET 6, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x04://SET 6, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x05://SET 6, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x06://SET 6, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b01000000));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x07://SET 6, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b01000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;
                                    case 0x08://SET 7, B
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.B | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x09://SET 7, C
                                        if(this.extracycle==2){
                                            this.registers.B = this.registers.C | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;
                                    case 0x0A://SET 7, D
                                        if(this.extracycle==2){
                                            this.registers.D = this.registers.D | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0B://SET 7, E
                                        if(this.extracycle==2){
                                            this.registers.E = this.registers.E | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }      
                                    break;
                                    case 0x0C://SET 7, H
                                        if(this.extracycle==2){
                                            this.registers.H = this.registers.H | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }        
                                    break;
                                    case 0x0D://SET 7, L
                                        if(this.extracycle==2){
                                            this.registers.L = this.registers.L | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }       
                                    break;
                                    case 0x0E://SET 7, [HL]
                                        if(this.extracycle==4){
                                            this.memory.writeByte((this.memory.readByte(this.HL)| 0b10000000));
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }           
                                    break;                                    
                                    case 0x0F://SET 7, A
                                        if(this.extracycle==2){
                                            this.registers.A = this.registers.A | 0b10000000;
                                            this.extracycle = 0;
                                            this.PC+=2;
                                        }               
                                    break;                                                                                                                                                
                                }
                            break;                                                                                                                                                                                                                                                   
                        }



                    break; 
                    case 0x0C: // CALL Z, a16                
                    if(!this.ZFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==6){ //watch closely
                            const target = (this.PC+3)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = (byte3<<8) | byte2;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==5){
                            const target = (this.PC+3)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }       

                    }                 
                    break; 
                    case 0x0D: // CALL a16                   
                        if(this.extracycle==6){ //watch closely
                            const target = (this.PC+3)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = (byte3<<8) | byte2;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==5){
                            const target = (this.PC+3)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }       
                    break; 
                    case 0x0E: // ADC A,n8               
                        if(this.extracycle==2){
                            this.registers.A = this._8bitadd(this.registers.A,byte2,true);
                            
                            this.extracycle = 0;
                            this.PC+=2;
                        }               
                    break;
                    case 0x0F: // RST $08                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0008;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;                     
                }

                break;
                // almost done!
            case 0x0D:
                switch(LN1){
                    case 0x00: // RET NC
                    if(this.CFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    }else{
                        if(this.extracycle==5){
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }    

                    }              
  
                    break;
                    case 0x01: // POP DE                  
                        if(this.extracycle==3){
                            this.registers.D = this.memory.readByte(this.SP+1);
                            this.registers.E = this.memory.readByte(this.SP);
                            this.SP+=2;
                            this.extracycle = 0;
                            this.PC++;
                        }           
                    break;
                    case 0x02: // JP NC, a16
                    
                    if(this.CFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==4){
                            this.PC = (byte3<<8) | byte2;
                            this.extracycle = 0;
                        }    

                    }              
                    break;             
                    case 0x03: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    break;
                    case 0x04: // CALL NC a16                  
                    if(this.CFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==6){ //watch closely
                            const target = (this.PC+3)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = (byte3<<8) | byte2;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==5){
                            const target = (this.PC+3)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }       

                    }            
                    break;
                    case 0x05: // PUSH DE                     
                        if(this.extracycle==4){ // this also
                            
                            
                            this.memory.writeByte(this.SP-2,this.registers.E);
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
   
                            this.memory.writeByte(this.SP-1,this.registers.D);
                        }           
                    break;
                    case 0x06: // SUB A,n8                  
                        if(this.extracycle==2){
                           
                            this.registers.A = this._8bitsub(this.registers.A,byte2);
  
                     
                            this.extracycle = 0;
                            this.PC+=2;
                        }            
                    break;
                    
                    case 0x07: // RST $10                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0010;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;
                    case 0x08: // RET C     
                    if(!this.CFLAG){
                        if(this.extracycle==2){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    }else{
                        if(this.extracycle==5){
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }    

                    }                         
                    break; 
                    case 0x09: // RETI            
                        if(this.extracycle==4){
                            this.IME = true;
                            this.PC = ((this.memory.readByte(this.SP+1)<<8) | this.memory.readByte(this.SP));
                            this.SP+=2;
                            this.extracycle = 0;
                            
                        }                       
                    break;  
                    case 0x0A:// JP C ,a16                 
                    if(!this.CFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==4){
                            this.PC = (byte3<<8) | byte2;
                            this.extracycle = 0;
                        }    

                    }                
                    break; 
                    case 0x0B: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }     


                    break; 
                    case 0x0C: // CALL C, a16                
                    if(!this.CFLAG){
                        if(this.extracycle==3){
                            this.extracycle = 0;
                            this.PC+=3;
                        }          

                    }else{
                        if(this.extracycle==6){ //watch closely
                            const target = (this.PC+3)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = (byte3<<8) | byte2;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==5){
                            const target = (this.PC+3)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }       

                    }                 
                    break; 
                    case 0x0D: // illegal opcode                  
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0E: // SBC A,n8               
                        if(this.extracycle==2){
                            this.registers.A = this._8bitsub(this.registers.A,byte2,true); 
                            this.extracycle = 0;
                            this.PC+=2;
                        }               
                    break;
                    case 0x0F: // RST $18                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0018;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;                     
                }

                break;
            case 0x0E:
                switch(LN1){
                    case 0x00: // LDH [a8],A
                        if(this.extracycle==3){
                            this.memory.writeByte(0xFF00|byte2,this.registers.A);
                            this.extracycle = 0;
                            this.PC+=2;
                        }               
  
                    break;
                    case 0x01: // POP HL                  
                        if(this.extracycle==3){
                            this.registers.H = this.memory.readByte(this.SP+1);
                            this.registers.L = this.memory.readByte(this.SP);
                            this.SP+=2;
                            this.extracycle = 0;
                            this.PC++;
                        }           
                    break;
                    case 0x02: // LDH [C],A
                    
                        if(this.extracycle==2){
                            this.memory.writeByte(0xFF00|this.registers.C,this.registers.A);
                            this.extracycle = 0;
                            this.PC++;
                        }          
                    break;             
                    case 0x03: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    break;
                    case 0x04: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    break;
                    case 0x05: // PUSH HL                     
                        if(this.extracycle==4){ // this also
                            
                            
                            this.memory.writeByte(this.SP-2,this.registers.L);
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
   
                            this.memory.writeByte(this.SP-1,this.registers.H);
                        }           
                    break;
                    case 0x06: // AND A,n8                  
                        if(this.extracycle==2){
                            this.NFLAG = 0;
                            this.HFLAG = 1;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A&byte2;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;     

                     
                            this.extracycle = 0;
                            this.PC+=2;
                        }            
                    break;
                    
                    case 0x07: // RST $20                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0020;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;
                    case 0x08: // ADD SP, e8   
                        if(this.extracycle==4){
                         
                            
                             this.ZFLAG = 0;
                            this.NFLAG = 0;
                            const pos = (128 + byte2)&255-128;

                                if(((pos&0xF)+(this.SP&0xF))>0xF){ 
                                    this.HFLAG = 1;
                                }else{
                                    this.HFLAG = 0;
                                }
                                if(((pos&0xFF)+(this.SP&0xFF))>0xFF){ 
                                    this.CFLAG = 1;
                                }else{
                                    this.CFLAG = 0;
                                }   
                            this.SP = this._16bitadd(this.SP,pos);                               
                            this.extracycle = 0;
                            this.PC+=2;
                        }    


                   
                    break; 
                    case 0x09: // JP HL            
                        if(this.extracycle==1){
                            this.PC = this.HL;
                            this.extracycle = 0;
                            
                        }                       
                    break;  
                    case 0x0A:// LD [a16],A              
                   
                        if(this.extracycle==4){
                            this.extracycle = 0;
                            this.memory.writeByte((byte3 << 8)|byte2,this.registers.A);
                            this.PC+=3;
                        }          

                       
                    break; 
                    case 0x0B: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }     


                    break; 
                    case 0x0C: // illegal opcode                  
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0D: // illegal opcode                  
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0E: // XOR A,n8               
                        if(this.extracycle==2){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A^byte2;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;     

                     
                            this.extracycle = 0;
                            this.PC+=2;
                        }                
                    break;
                    case 0x0F: // RST $28                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0028;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;                     
                }

                break;
            case 0x0F:
                switch(LN1){
                    case 0x00: // LDH A,[a8]
                        if(this.extracycle==3){
                            this.registers.A = this.memory.readByte(0xFF00|byte2);
                            this.extracycle = 0;
                            this.PC+=2;
                        }               
  
                    break;
                    case 0x01: // POP AF                  
                        if(this.extracycle==3){
                            this.registers.A = this.memory.readByte(this.SP+1);
                            this.registers.F = this.memory.readByte(this.SP);
                            this.SP+=2;
                            this.ZFLAG = (this.registers.F&0x80)>>7;
                            this.NFLAG = (this.registers.F&0x40)>>6;
                            this.HFLAG = (this.registers.F&0x20)>>5;
                            this.CFLAG = (this.registers.F&0x10)>>4;
                            this.extracycle = 0;
                            this.PC++;
                        }           
                    break;
                    case 0x02: // LDH A,[C]
                    
                        if(this.extracycle==2){
                            this.registers.A = this.memory.readByte(0xFF00|this.registers.C);
                            this.extracycle = 0;
                            this.PC++;
                        }          
                    break;             
                    case 0x03: // DI          
                        if(this.extracycle==1){
                            this.IME = false;
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    break;
                    case 0x04: // illegal opcode                
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }          

                    break;
                    case 0x05: // PUSH AF                     
                        if(this.extracycle==4){ // this also
                            
                            
                            this.memory.writeByte(this.SP-2,this.registers.F);
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
   
                            this.memory.writeByte(this.SP-1,this.registers.A);
                        }           
                    break;
                    case 0x06: // OR A,n8                  
                        if(this.extracycle==2){
                            this.NFLAG = 0;
                            this.HFLAG = 0;
                            this.CFLAG = 0;
                            
                            this.registers.A = this.registers.A|byte2;
                            if(this.registers.A==0) this.ZFLAG = 1;
                            else this.ZFLAG = 0;     

                     
                            this.extracycle = 0;
                            this.PC+=2;
                        }            
                    break;
                    
                    case 0x07: // RST $30                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0030;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;
                    case 0x08: // LD HL, SP + e8   
                        if(this.extracycle==3){
                         
                            
                             this.ZFLAG = 0;
                            this.NFLAG = 0;
                            const pos = (128 + byte2)&255-128;

                                if(((pos&0xF)+(this.SP&0xF))>0xF){ 
                                    this.HFLAG = 1;
                                }else{
                                    this.HFLAG = 0;
                                }
                                if(((pos&0xFF)+(this.SP&0xFF))>0xFF){ 
                                    this.CFLAG = 1;
                                }else{
                                    this.CFLAG = 0;
                                }
                            const pos2 = this._16bitadd(this.SP,pos);  
                            this.HL = this.memory.readByte(pos2);                                    
                            this.extracycle = 0;
                            this.PC+=2;
                        }    


                   
                    break; 
                    case 0x09: // LD SP, HL            
                        if(this.extracycle==2){
                            this.SP = this.HL;
                            this.PC++;
                            this.extracycle = 0;
                            
                        }                       
                    break;  
                    case 0x0A:// LD A,[a16]              
                   
                        if(this.extracycle==4){
                            this.registers.A =this.memory.readByte((byte3 << 8)|byte2);
                            this.extracycle = 0;
                            
                            this.PC+=3;
                        }          

                       
                    break; 
                    case 0x0B: // EI             
                        if(this.extracycle==1){
                            this.IME = true;
                            this.extracycle = 0;
                            this.PC++;
                        }     


                    break; 
                    case 0x0C: // illegal opcode                  
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0D: // illegal opcode                  
                        if(this.extracycle==1){
                            this.extracycle = 0;
                            this.PC++;
                        }      
                    break; 
                    case 0x0E: // CP A,n8               
                        if(this.extracycle==2){
                            this._8bitsub(this.registers.A,byte2);
                            this.extracycle = 0;
                            this.PC+=2;
                        }                
                    break;
                    case 0x0F: // RST $38                   
                        if(this.extracycle==4){ //watch closely
                            const target = (this.PC+1)&0xFFFF;
                            
                            this.memory.writeByte(this.SP-2,target&0xFF);
                            this.PC = 0x0038;
                            this.SP-=2;
                            this.extracycle = 0;
                            
                        }else if(this.extracycle==3){
                            const target = (this.PC+1)&0xFFFF;
                            this.memory.writeByte(this.SP-1,target>>8);
                        }              
                    break;                     
                }

                break;                                                          
        }

    }


    
}