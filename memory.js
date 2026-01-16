
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




            if(address==0xFF00) this.bigmemory[address] = (this.joypad.getsgn() & 0x0F) | (this.bigmemory[address] & 0x30) | 0xC0;
           
            let vramchecker = true;
            if(this.ppuinfo.mode===2||this.ppuinfo.mode===3){
                if(address>=0xFE00&&address<=0xFE9F) vramchecker = false;
            }
            if(this.ppuinfo.mode==3&&address>=0x8000&&address<=0x9FFF) vramchecker = false;
            
            
            if(!vramchecker) return 0xFF;
            
            

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
                            else return 0xFF;

                            } else return this.bigmemory[address];

                        }else if(address<=0x3FFF){
                            
                            return this.rom[((this.currentrombank&0x60)*0x4000)+address];
                        }
                       
                    }else{
                        if(address>=0xA000&&this.cartridgetype!=0x01){
                            if(this.extraramon) return this.rambank[this.ramarea*0x2000+(address-0xA000)];
                            else return 0xFF;
                        }
                        else return this.bigmemory[address];

                    }

                    return this.bigmemory[address];
                default:
                    return this.bigmemory[address];

                

            }



        }

        return this.bigmemory[address];

    }
    
    writeByte(address,value){
        if(address<0xC000){
            switch(this.mbc){
                case 0:
                    // does not write if rom area
                    if(address>=0x8000){
                        this.bigmemory[address] = value;
                        
                    }
                break;
                case 1:
                 
                    if(address>=0x8000){

                        if(address>=0xA000&&this.cartridgetype!=0x01){
                            if(this.extraramon) this.rambank[this.ramarea*0x2000+(address-0xA000)] = value;
                        }
                        else this.bigmemory[address] = value;
                        
                    }
                    else if(address<=0x1FFF){
                        if((value&0xF)==0xA){
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
                            this.rambank = value&3;
                        }

                    }else{ // 6000 ~ 7FFF ig
                        this.bankingmode = value&1;

                    }     

                break;
             

                default:
      
                    if(address>=0x8000){
                        this.bigmemory[address] = value;
                    }
                break;
            }

        }else{
            let vramchecker = true;
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
                        

                    break;
                }
            }
            if(vramchecker) this.bigmemory[address] = value;
       

        }

        

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
        switch(this.cartridgetype){
            case 0x00:
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }

            break;
            case 0x01:
                this.mbc = 1;
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }

            break;                
            case 0x02:
                this.mbc = 1;
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }

            break;  
            case 0x03:
                this.mbc = 1;
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }

            break;              
            default:
                for(let i=0;i<0x8000;i++){
                    this.bigmemory[i] = this.rom[i];

                }

            break;

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
        if(this.rom!=null){
            this.loadrom();
        }
        
        for (let i=0;i<0x0100;i++) {
            this.bigmemory[i] = parseInt(this.bootrom.substring(i*2,i*2+2), 16); 
            //console.log(this.bigmemory[i].toString(16));
        }
        



    }
    
}