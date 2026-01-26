const mbctable = new Uint8Array(0x1F).fill(0);
mbctable[0x01] = 1;
mbctable[0x02] = 1;
mbctable[0x03] = 1;
mbctable[0x05] = 2;
mbctable[0x06] = 2;
mbctable[0x0F] = 3;
mbctable[0x10] = 3;
mbctable[0x11] = 3;
mbctable[0x12] = 3;
mbctable[0x13] = 3;
mbctable[0x19] = 5;
mbctable[0x1A] = 5;
mbctable[0x1B] = 5;
mbctable[0x1C] = 5;
mbctable[0x1D] = 5;
mbctable[0x1E] = 5;

export class gabememory{
    constructor(){
        this.bootrom = "31 FE FF 21 FF 9F AF 32 CB 7C 20 FA 0E 11 21 26 FF 3E 80 32 E2 0C 3E F3 32 E2 0C 3E 77 32 E2 11 04 01 21 10 80 1A CD B8 00 1A CB 37 CD B8 00 13 7B FE 34 20 F0 11 CC 00 06 08 1A 13 22 23 05 20 F9 21 04 99 01 0C 01 CD B1 00 3E 19 77 21 24 99 0E 0C CD B1 00 3E 91 E0 40 06 10 11 D4 00 78 E0 43 05 7B FE D8 28 04 1A E0 47 13 0E 1C CD A7 00 AF 90 E0 43 05 0E 1C CD A7 00 AF B0 20 E0 E0 43 3E 83 CD 9F 00 0E 27 CD A7 00 3E C1 CD 9F 00 11 8A 01 F0 44 FE 90 20 FA 1B 7A B3 20 F5 18 49 0E 13 E2 0C 3E 87 E2 C9 F0 44 FE 90 20 FA 0D 20 F7 C9 78 22 04 0D 20 FA C9 47 0E 04 AF C5 CB 10 17 C1 CB 10 17 0D 20 F5 22 23 22 23 C9 3C 42 B9 A5 B9 A5 42 3C 00 54 A8 FC 42 4F 4F 54 49 58 2E 44 4D 47 20 76 31 2E 32 00 3E FF C6 01 0B 1E D8 21 4D 01 00 00 00 00 00 00 00 00 00 00 3E 01 E0 50".replace(/\s/g, '');
        //https://github.com/Ashiepaws/Bootix/releases/tag/v1.2
        
        //0x4000~7FFF Bank switching area 16KiB
        //0x8000~9FFF VRAM 8KiB
        //0xA000~BFFF External RAM 8KiB
        //0xC000~CFFF WRAM bank 0 4KiB
        //0xD000~DFFF WRAM bank switching 4KiB

        // wall maria

        //0xFE00~FE9F OAM sprite stuff 160B
        //0xFF00~FF7F I/O 128B
        //0xFF80~FFFE HRAM 127B
        //0xFFFF Inturrupt Enable Register 1B
        this.rom = null; // big very
        //0x0100-014F cartridge header 80B

       this.OAMtransfercycle = 0;
        this.romsize = 0;
        this.ramsize = 0;
        this.bigmemory = new Uint8Array(0x10000);
        this.rambank = new Uint8Array(0x20000);
        this.cartridgetype = 0;
        this.bankingmode = 0;
        this.currentrombank = 1;
        this.ppuinfo = null;
        this.joypad = null;
        this.ramarea = 0;
        this.extraramon = false;
        this.rombankmasker = 0;
        this.mbc = 0;
        this.rtcon = false;
        this.lastrtcwrote = 2;
        this.rtchour = 0;
        this.rtcminute = 0;
        this.rtcsecond = 0;
        this.rtcday = 0;
        this.rtcflag = 0;
        this.rtcunixtime = Math.floor(Date.now()/1000);
        this.beforeofftime = Math.floor(Date.now()/1000);
        this.rtcstoptime = 0;
    }
    incrementdiv(){
        this.bigmemory[0xFF04]++;
        
    }


    PPUreadByte(address){
       
        return this.bigmemory[address&0xFFFF];
    }
    PPUwriteByte(address,value){
        this.bigmemory[address] = value;
    }

    
    readByte(address){




            
            if(address>=0x8000){
            let vramchecker = true;
            if(address==0xFF00) this.bigmemory[address] = (this.joypad.getsgn() & 0x0F) | (this.bigmemory[address] & 0x30) | 0xC0;
            if(this.ppuinfo.mode===2||this.ppuinfo.mode===3){
                if(address>=0xFE00&&address<=0xFE9F) vramchecker = false;
            }
            if(this.ppuinfo.mode==3&&address>=0x8000&&address<=0x9FFF) vramchecker = false;
            if(this.OAMtransfercycle){
                if(address<0xFF80||address>=0xFFFE) vramchecker = false;
            }
            
            if(!vramchecker) return 0xFF;


            }

            
            
    
            if(address<0xC000){


                
            
            switch(this.mbc){
                case 0:
                    return this.bigmemory[address];
                
                case 1: // make sure to use top banana when mode 1
                    if(address>=0x4000&&address<=0x7FFF){
                        return this.rom[(this.currentrombank*0x4000)+(address-0x4000)];
                    }
                    if(this.bankingmode===1){
                        if(address>=0xA000){
                            if(this.cartridgetype!==0x01){
                            if(this.extraramon) return this.rambank[this.ramarea*0x2000+(address-0xA000)];
                            return 0xFF;

                            }
                            return this.bigmemory[address];

                        }else if(address<=0x3FFF){
                            
                            return this.rom[((this.currentrombank&0x60)*0x4000)+address];
                        }
                       
                    }else{
                        if(address>=0xA000&&this.cartridgetype!=0x01){
                            if(this.extraramon) return this.rambank[this.ramarea*0x2000+(address-0xA000)];
                            return 0xFF;
                        }
                        return this.bigmemory[address];

                    }

                    return this.bigmemory[address];
                case 2:
                    if(address>=0x4000&&address<=0x7FFF){
                        return this.rom[(this.currentrombank*0x4000)+(address-0x4000)];
                    }
                    else{
                        if(address>=0xA000){
                            if(this.extraramon) return this.bigmemory[0xA000+(address&0x1FF)] | 0xF0;
                            return 0xFF;
                        }
                        return this.bigmemory[address];

                    }


                case 3: 
                    if(address>=0x4000&&address<=0x7FFF){
                        return this.rom[(this.currentrombank*0x4000)+(address-0x4000)];
                    }

                        if(address>=0xA000){
                            if(this.ramarea<0x08){
                                if(this.extraramon) return this.rambank[this.ramarea*0x2000+(address-0xA000)];
                                return 0xFF;
                            }
                            switch(this.ramarea){
                                case 0x08:
                                    return this.rtcsecond;
                                case 0x09:
                                    return this.rtcminute;
                                case 0x0A:
                                    return this.rtchour;
                                case 0x0B:
                                    return this.rtcday;
                                case 0x0C:
                                    return this.rtcflag;


                            }



                        }
                        return this.bigmemory[address];


                case 5:
                    if(address>=0x4000&&address<=0x7FFF){
                        return this.rom[(this.currentrombank*0x4000)+(address-0x4000)];
                    }

                        if(address>=0xA000&&this.cartridgetype!=0x19&&this.cartridgetype!=0x1C){
                            if(this.extraramon) return this.rambank[this.ramarea*0x2000+(address-0xA000)];
                            return 0xFF;
                        }
                        return this.bigmemory[address];

                    




                    
                    


            }

        }

    return this.bigmemory[address];    

        

    }
    
    writeByte(address,value){

        let vramchecker = true;
        if(address>=0x8000){
            
            if(this.OAMtransfercycle){
                if(address<0xFF80||address>=0xFFFE) vramchecker = false;
            }
            

            
            if(this.ppuinfo.mode===2||this.ppuinfo.mode===3){
                if(address>=0xFE00&&address<=0xFE9F) vramchecker = false;
            }
            if(this.ppuinfo.mode===3&&address>=0x8000&&address<=0x9FFF) vramchecker = false;

            
            
            if(address>=0xE000&&address<=0xFDFF){
                
                this.bigmemory[address-0x2000] = value;
                
            }
            if(address>=0xC000&&address<=0xDDFF){
                
                this.bigmemory[address+0x2000] = value;
               
            }
            if(address>=0xFF00&&address<=0xFF7F){
                switch(address){
                    case 0xFF00:
                        
                        this.bigmemory[address] = (this.joypad.getsgn() & 0x0F) | (value & 0x30) | 0xC0;
                        
                        this.vramchecker = false;
                    break;
                    case 0xFF02:
                        if(value==0x81){
                            this.bigmemory[0xFF01] = 0xFF;
                            this.vramchecker = false;
                            this.bigmemory[0xFF02] = 0x80;
                            this.bigmemory[0xFF0F] = this.bigmemory[0xFF0F] | 0x08;
                        }
                    break;
                    case 0xFF04:
                        this.bigmemory[address] = 0;
                        this.vramchecker = false;
                    break;
                    case 0xFF41:
                        this.bigmemory[address] = (this.bigmemory[address]&3)|(value&0xFC);
                        this.vramchecker = false;
                    break;
                    case 0xFF44:
                       
                        this.vramchecker = false;
                    break;
                    case 0xFF46:
                        this.bigmemory[address] = value;
                        this.OAMtransfercycle = 1;
                        
                    break;
                    case 0xFF50:
                        if(value){
                            if(this.rom!=null){
                            for(let i=0;i<0x100;i++){
                                this.bigmemory[i] = this.rom[i];

                            }
                            }

                            
                        }

                    break;
                    default:
                        this.bigmemory[address] = value;

                    break;

                }
            }

       

        }





        if(address<0xC000){
            switch(this.mbc){
                case 0:
                    // does not write if rom area
                    if(address>=0x8000){
                        this.bigmemory[address] = value;
                        
                    }
                return;
                case 1:
                 
                    if(address>=0x8000){

                        if(address>=0xA000&&this.cartridgetype!=0x01){
                            if(this.extraramon) this.rambank[this.ramarea*0x2000+(address-0xA000)] = value;
                        }
                        else this.bigmemory[address] = value;
                        return;
                    }
                    else if(address<=0x1FFF){
                        if((value&0xF)==0xA&&this.cartridgetype!=0x01){
                            this.extraramon = true;
                        }else{
                            this.extraramon = false;
                        }
                    }
                    else if(address<=0x3FFF){
                        let banknum = value&0x1F;
                        
                        if(banknum===0){
                            banknum = 1;
                        }
                        
                        this.currentrombank = (this.currentrombank & 0x60) | (banknum&this.rombankmasker);
                        
                        
                    }else if(address<=0x5FFF){
                        if(this.rombankmasker>32){ // rom big
                            this.currentrombank = (this.currentrombank & 0x1F) | ((value << 5)&this.rombankmasker);

                        }else if(this.ramsize===3){
                            this.ramarea = value&3;
                        }

                    }else{ // 6000 ~ 7FFF ig
                        this.bankingmode = value&1;

                    }     

                return;
                case 2:
                    if(address<=0x3FFF){
                        if(address&0x100){
                        let banknum = value&0x0F;
                        if(banknum===0){
                            banknum = 1;
                        }
                        
                        this.currentrombank = (banknum&this.rombankmasker);
                        }else{
                            if((value&0x0F)== 0x0A) this.extraramon = true;
                            else this.extraramon = false;
                        }

                        
                        
                    }else if(address>=0x8000){
                        if(address>=0xA000){
                            if(this.extraramon) this.bigmemory[0xA000+(address&0x1FF)] = value&0x0F;
                        }
                        else this.bigmemory[address] = value;

                    }

                return;         
                case 3:
                 
                    if(address>=0x8000){

                        if(address>=0xA000){ //rtc ,ram
                            if(this.ramarea<0x08){
                                if(this.extraramon) this.rambank[this.ramarea*0x2000+(address-0xA000)] = value;
                            }else{
                                let finoffset = 0;
                                switch(this.ramarea){

                                    case 0x08:
                                        
                                        this.rtcsecond = value%60;

                                        finoffset += this.rtcsecond;
                                        finoffset += this.rtcminute * 60;
                                        finoffset += this.rtchour * 3600;
                                        finoffset += this.rtcday * 86400;
                                        finoffset += (this.rtcflag&1) * 256 * 86400;


                                        this.rtcstoptime =  Math.floor(Date.now()/1000) - finoffset;
                                        this.beforeofftime = Math.floor(Date.now()/1000);
                                    break;
                                    case 0x09:
                                        
                                        this.rtcminute = value%60;

                                        finoffset += this.rtcsecond;
                                        finoffset += this.rtcminute * 60;
                                        finoffset += this.rtchour * 3600;
                                        finoffset += this.rtcday * 86400;
                                        finoffset += (this.rtcflag&1) * 256 * 86400;

                                        
                                        this.rtcstoptime =  Math.floor(Date.now()/1000) - finoffset;
                                        this.beforeofftime = Math.floor(Date.now()/1000);
                                    break;
                                    case 0x0A:
                                        finoffset = 0; 
                                        this.rtchour = value%60;

                                        finoffset += this.rtcsecond;
                                        finoffset += this.rtcminute * 60;
                                        finoffset += this.rtchour * 3600;
                                        finoffset += this.rtcday * 86400;
                                        finoffset += (this.rtcflag&1) * 256 * 86400;

                                        
                                        this.rtcstoptime =  Math.floor(Date.now()/1000) - finoffset;
                                        this.beforeofftime = Math.floor(Date.now()/1000);
                                    break;
                                    case 0x0B:
                                        finoffset = 0; 
                                        this.rtcday = value%60;

                                        finoffset += this.rtcsecond;
                                        finoffset += this.rtcminute * 60;
                                        finoffset += this.rtchour * 3600;
                                        finoffset += this.rtcday * 86400;
                                        finoffset += (this.rtcflag&1) * 256 * 86400;

                                        
                                        this.rtcstoptime =  Math.floor(Date.now()/1000) - finoffset;
                                        this.beforeofftime = Math.floor(Date.now()/1000);
                                    break;                                    
                                    case 0x0C:

                                    if(this.rtcflag&64){
                                        if(value&64==0){ // on
                                        this.rtcstoptime += (Math.floor(Date.now()/1000) -this.beforeofftime);
                                        }
                                    }else if(value&64){
                                        this.beforeofftime = Math.floor(Date.now()/1000);

                                    }

                                    this.rtcflag = value;
                                    

                                    
                                    break;

                                }
                            }

                        }
                        else this.bigmemory[address] = value;
                        
                    }
                    else if(address<=0x1FFF){ //rtc and ram on/off
                        if((value&0xF)==0xA){
                            
                            if(this.cartridgetype==0x10||this.cartridgetype==0x12||this.cartridgetype==0x13) this.extraramon = true;
                            if(this.cartridgetype==0x10||this.cartridgetype==0x0F) this.rtcon = true;
                        }else{
                            this.extraramon = false;
                            this.rtcon = false;
                        }
                    }
                    else if(address<=0x3FFF){
                        let banknum = value&0x7F;
                        
                        if(banknum===0){
                            banknum = 1;
                        }
                        
                        this.currentrombank = banknum&this.rombankmasker;
                        
                        
                    }else if(address<=0x5FFF){ //ram bank 00~07
                        if(value<0x0D){
                            this.ramarea = value;


                        }

                    }else{ // latch clock data
                        if(this.rtcon){
                            if(this.lastrtcwrote == 0 && value == 1){
                                let diff = 0;
                                if(this.rtcflag&0x64){
                                    diff = this.beforeofftime - this.rtcunixtime - this.rtcstoptime;

                                }else{
                                    diff = Math.floor(Date.now()/1000) - this.rtcunixtime - this.rtcstoptime;
                                }
                                this.rtcday = diff/86400;
                                if(this.rtcday>=0x200){
                                    this.rtcday = this.rtcday&0x1FF;
                                    this.rtcflag = this.rtcflag | 128;
                                }
                                if(this.rtcday>0xFF){
                                    this.rtcday = this.rtcday&0xFF;
                                    this.rtcflag = this.rtcflag | 1;
                                }else{
                                    this.rtcflag = this.rtcflag & 0xFE;
                                }
                                const diff2 = (diff%86400);
                                this.rtchour = diff2/24;
                                const diff3 = diff2%3600;
                                this.rtcminute = diff3/60;
                                const diff4 = diff3%60;
                                this.rtcsecond = diff4;

                            }
                            this.lastrtcwrote = value;

                        }

                    }     

                return;

                case 5:
                 
                    if(address>=0x8000){

                        if(address>=0xA000&&this.cartridgetype!=0x19&&this.cartridgetype!=0x1C){
                            if(this.extraramon) this.rambank[this.ramarea*0x2000+(address-0xA000)] = value;
                        }
                        else this.bigmemory[address] = value;
                        return;
                    }
                    else if(address<=0x1FFF){
                        if((value&0xF)==0xA&&this.cartridgetype!=0x19&&this.cartridgetype!=0x1C){
                            this.extraramon = true;
                        }else{
                            this.extraramon = false;
                        }
                    }
                    else if(address<=0x2FFF){
                        const banknum = (value&1) << 8;
                        this.currentrombank = ((this.currentrombank&0xFF) | banknum)&this.rombankmasker;

                    }
                    else if(address<=0x3FFF){
                        
                        
                        
                        this.currentrombank = (this.currentrombank&256) | (value&this.rombankmasker);
                        
                        
                    }else if(address<=0x5FFF){

                        switch(this.ramsize){
                            case 0x02:
                                this.ramarea = 0;
                            break;
                            case 0x03:
                                this.ramarea = value&3;
                            break;
                            case 0x04:
                                this.ramarea = value&0xF;
                            break;
                            case 0x05:
                                this.ramarea = value&7;
                            break;
                        }
                            
                        

                    }

                return;


                default:
      
                    if(address>=0x8000){
                        this.bigmemory[address] = value;
                    }
                return;
            }

        }

            if(vramchecker) this.bigmemory[address] = value;
        

    }


    loadrom(){
        if(this.rom!=null){
        
        this.cartridgetype = this.rom[0x0147];
        this.romsize = this.rom[0x0148];
        this.rombankmasker = 0;
        for(let i=0;i<=this.romsize;i++){
            this.rombankmasker = this.rombankmasker << 1;
            this.rombankmasker = this.rombankmasker | 1;
            
        }
        this.ramsize = this.rom[0x0149];
       

            
            this.mbc = mbctable[this.cartridgetype];
 
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }
        }
        

    }
    reset(){
        this.bigmemory.fill(0);
        this.rambank.fill(0);
        this.bigmemory[0xFF00] = 0xFF;
        //this.bigmemory[0xFF40] = 0xFF;
        this.cartridgetype = 0;
        this.bankingmode = 0;
        this.OAMtransfercycle = 0;
        this.ramarea = 0;
        this.extraramon = false;
        this.currentrombank = 1;
        this.romsize = 0;
        this.ramsize = 0;
        this.mbc = 0;
        this.rombankmasker = 0;
        this.rtcon = false;
        this.lastrtcwrote = 2;
        this.rtchour = 0;
        this.rtcminute = 0;
        this.rtcsecond = 0;
        this.rtcday = 0;
        this.rtcflag = 0;
        this.rtcunixtime = Math.floor(Date.now()/1000);      
        this.beforeofftime = Math.floor(Date.now()/1000);  
        this.rtcstoptime = 0;
        if(this.rom!=null){
            this.loadrom();
        }
        
        for (let i=0;i<0x0100;i++) {
            this.bigmemory[i] = parseInt(this.bootrom.substring(i*2,i*2+2), 16); 
            //console.log(this.bigmemory[i].toString(16));
        }
        



    }
    
}