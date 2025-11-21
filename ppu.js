
// show canvas after 1 big batch so it shows 60hz or smth
// also when showing check LCD enable
// rgb(100, 48, 122)
// rgb(142,68,173)
// rgb(155,89,182)
// rgb(183,137,203)
export class GABEPPU{
    constructor(memory){
        this.memory = memory;
        this.tcycle = 0;
        this.canvas = null;
        this.extracycle = 0;
        this.turnedoff = false;
        this.mode = 2;
        this.dotstorage = new Uint8Array(144*160).fill(0);
        this.curx = 0;
        this.wiy = 0;
        this.m3p = 0;
        this.windowing = false;
        this.pixelbuffer = {
            data : new Uint8Array(16).fill(0),
            head : 0,
            tail : 0,
            size : 0
        };
        this.pixelbuffer = {
            data : new Uint8Array(16).fill(0),
            head : 0,
            tail : 0,
            size : 0
        };
        this.gagocycle = 0;
        this.gagomode = 0;
    }

    putdot(y,x){
        let thatonedot = 0;
    }

    reset(){
        this.tcycle = 0;
        this.extracycle = 0;
        this.turnedoff = false;
        this.mode = 2;
        this.memory.PPUwriteByte(0xFF44,0);
        this.dotstorage.fill(0);
        this.pixelbuffer.fill(0);
        this.objectbuffer.fill(0);
        this.gagocycle = 0;
        this.gagomode = 0;
        this.wiy = 0;
        this.curx = 0;
        this.m3p = 0;
        this.windowing = false;
    }
    getly(){
        return this.memory.PPUreadByte(0xFF44);
    }
    incremently(){
        let val = this.memory.PPUreadByte(0xFF44)+1;
        if(val>153)val=0;
        this.memory.PPUwriteByte(0xFF44,val);
    }
    //FF40 = LCDC
    //FF4A WY FF4B WX
    //FF42 SCY FF43 SCX
    showscreen(){
        if(this.turnedoff){
            this.canvas.fillStyle = "rgb(0, 0, 0)"
            this.canvas.fillRect(0, 0, 480, 432);
        }else{
            for(let i=0;i<144*160;i++){
                switch(this.dotstorage[i]){
                    case 0:
                        this.canvas.fillStyle = "rgb(183,137,203)";
                    break;
                    case 1:
                        this.canvas.fillStyle = "rgb(155,89,182)";
                    break;
                    case 2:
                        this.canvas.fillStyle = "rgb(142,68,173)";
                    break;
                    case 3:
                        this.canvas.fillStyle = "rgb(100, 48, 122)";
                    break;                                                            
                }
                this.canvas.fillRect(i*3,(i/160)*3,3,3);
            }
        }
    }
    cyclerun(){ //reset extracycle every 456 dots
        this.tcycle++;
        if(!this.turnedoff){
            const curmode = this.mode;
            this.extracycle++;
            if(this.memory.PPUreadByte(0xFF40)&0x80){
                if(this.mode!=1){
                    if(this.extracycle<=80){
                        this.mode = 2;
                    }else if(this.curx<160){
                        this.mode = 3;
                        if(this.m3p){
                            this.m3p--;

                        }else{
                        this.gagocycle++;
                        switch(this.gagomode){
                            case 0: //get tile
                                if(this.gagocycle==2){
                                    if(!this.windowing){
                                        if(this.PPUreadByte(0xFF40)&1){
                                            if(this.PPUreadByte(0xFF40)&32){
                                        if(this.PPUreadByte(0xFF4A)<=this.getly()){
                                            if(this.PPUreadByte(0xFF4B)<=this.curx+7){
                                                if(this.PPUreadByte(0xFF4B)==this.curx+7){
                                                    this.windowing = true;
                                                    this.pixelbuffer.head = 0;
                                                    this.pixelbuffer.tail = 0;
                                                    this.pixelbuffer.size = 0;
                                                    this.m3p = 6;
                                                }
                                            }
                                        }
                                            }
                                        }

                                    }

                                    if(this.windowing){ // get pixel from window
                                        
                                    }else{


                                    }
                                    this.gagocycle = 0;
                                }

                            break;

                        }


                        }

                    }else{
                       
                        this.mode = 0;

                    }

                }
            }else{
                this.turnedoff = true;
                this.mode = 2;
                this.extracycle = 0;
                this.memory.PPUwriteByte(0xFF44,0);
                this.memory.PPUwriteByte(0xFF41,this.memory.PPUreadByte(0xFF41)&0xFC);
                this.showscreen();
            }
            if(this.extracycle==456){
                this.incremently();
                this.extracycle = 0;
                if(this.getly()==144){
                    this.wiy = 0;
                    this.showscreen();
                    this.mode = 1;
                  
                    this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|1);
                } 
                this.curx = 0;
                this.m3p = 0;
                this.gagocycle = 0;
                this.gagomode = 0;        
                this.objectbuffer.head = 0;
                this.objectbuffer.tail = 0;
                this.objectbuffer.size = 0;
                this.pixelbuffer.head = 0;
                this.pixelbuffer.tail = 0; 
                this.pixelbuffer.size = 0; 
                this.windowing = false;        
            }
            let STATs = PPUreadByte(0xFF41);
            if(PPUreadByte(0xFF45)==this.getly()){
                STATs = STATs | 4;
            }else{
                STATs = STATs & 0xFB;
            }
            STATs = (STATs & 0xFC) | this.mode;
            PPUwriteByte(0xFF41,STATs);
            
            if((STATs&0x40)&&(STATs&0x4)) this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|2);

            if(this.mode!=curmode){
            if((STATs&0x20)&&this.mode==2) this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|2);
            if((STATs&0x10)&&this.mode==1) this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|2);
            if((STATs&0x08)&&this.mode==0) this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|2);
            }
        }else if(this.memory.readByte(0xFF40)&0x80){
            this.turnedoff = false;
        }
        

    }    

}