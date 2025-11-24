
// show canvas after 1 big batch so it shows 60hz or smth
// also when showing check LCD enable
// rgb(100, 48, 122)
// rgb(142,68,173)
// rgb(155,89,182)
// rgb(183,137,203)

function compareobject(a,b){
    if((a&0x00FF0000)!==(b&0x00FF0000)){
        return a&0x00FF0000 - b&0x00FF0000;
    }
    

}

export class GABEPPU{
    constructor(memory){
        this.memory = memory;
      
        this.canvas = null;
        this.extracycle = 0;
        this.turnedoff = false;
        this.mode = 2;
        this.dotstorage = new Uint8Array(144*160).fill(0);
        this.curx = 0;
        this.wiy = -1;
        this.m3p = 0;
        this.windowing = false;
        this.pixelbuffer = {
            dataz : new Uint8Array(16).fill(0),
            head : 0,
            tail : 0,
            size : 0
        };
        this.objectbuffer = {
            dataz : new Uint8Array(16).fill(0),
            head : 0,
            tail : 0,
            size : 0
        };
        this.gagocycle = 0;
     
        this.oamarray = new Uint32Array();
        this.oampointer = 0;
        this.wytrigger = false;
        this.temptiledata = 0;
        this.temptileid = 0;
        this.tmpaddress = 0;
        this.size8arrayfor1line8dots = new Uint8Array(8).fill(0);
        this.lasttileforoam = -1;
        this.SCXWP = 0;
        this.STATsaver = 0;
        }



    reset(){
       
        this.extracycle = 0;
        this.turnedoff = false;
        this.mode = 2;
        this.memory.PPUwriteByte(0xFF44,0);
        this.dotstorage.fill(0);
        this.pixelbuffer.head = 0;
        this.pixelbuffer.tail = 0;
        this.pixelbuffer.size = 0;
        this.objectbuffer.head = 0;
        this.objectbuffer.tail = 0;
        this.objectbuffer.size = 0;
        this.gagocycle = 0;
        this.lasttileforoam = -1;
        this.wiy = -1;
        this.wytrigger = false;
        this.curx = 0;
        this.m3p = 0;
        this.windowing = false;
        this.temptileid = 0;
        this.temptiledata = 0;
        this.tmpaddress = 0;
        this.SCXWP = 0;
        this.STATsaver = 0;
    }
    getly(){
        return this.memory.PPUreadByte(0xFF44);
    }
    incremently(){
        let val = this.memory.PPUreadByte(0xFF44)+1;
        if(val>153){
            val=0;
        }
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
                this.canvas.fillRect((i%160)*3,Math.trunc(i/160)*3,3,3);
            }
        }
    }
    //FE00~FE9F OAM
    cyclerun(){ //reset extracycle every 456 dots
        
        const LCDC = this.memory.PPUreadByte(0xFF40);
        if(!this.turnedoff){
            
            this.extracycle++;
            
            if(LCDC&0x80){
                if(this.mode!==1){
                    if(this.extracycle<=80){
                        if(this.getly()===this.memory.PPUreadByte(0xFF4A)) this.wytrigger = true;
                        this.mode = 2;
                        if(this.extracycle===1){//oam scan
                            this.SCXWP = this.memory.PPUreadByte(0xFF43)&7;
                            this.oamarray = [];
                            
                            let oamiterator = 0xFE00;
                            while(this.oamarray.length<10&&oamiterator<0xFE9F){
                                let hit = false;
                                if(LCDC&0x04){
                                    if(this.memory.PPUreadByte(oamiterator)>this.getly()&&this.memory.PPUreadByte(oamiterator)<=this.getly()+16){
                                        hit = true;
                                    }
                                }else{
                                    if(this.memory.PPUreadByte(oamiterator)>this.getly()+8&&this.memory.PPUreadByte(oamiterator)<=this.getly()+16){
                                        hit = true;
                                    }
                                }
                                if(hit){
                                    this.oamarray.push((this.memory.PPUreadByte(oamiterator) << 24) | (this.memory.PPUreadByte(oamiterator+1) << 16) | (this.memory.PPUreadByte(oamiterator+2) << 8) | this.memory.PPUreadByte(oamiterator+3))
                                    
                                }else{
                                    oamiterator+=4;
                                }
                            }
                            this.oamarray.sort(compareobject); //pray stablesort works
                        }
                    }else if(this.curx<160){ // help
                        let checkerz = true;
                        this.mode = 3;
                            
                        if(this.m3p){
                            this.m3p--;

                        }else{
                            // add oam checker here
                            if(LCDC&2){
                                const gx = (this.oamarray[this.oampointer]&0x00FF0000) >> 16;
                                if(gx<=this.curx+8){

                                    checkerz = false;
                                    this.gagocycle = 0;
                                    
                                }

                            }
                            if(checkerz){
                            if(!this.windowing){
                                        if(LCDC&1){ // windowing
                                            if(LCDC&32){
                                        if(this.wytrigger){
                                            if(this.memory.PPUreadByte(0xFF4B)===this.curx+7){
                                                this.windowing = true;
                                                checkerz = false;
                                                this.pixelbuffer.head = 0;
                                                this.pixelbuffer.tail = 0;
                                                this.pixelbuffer.size = 0;
                                                this.m3p = 7; //extra 1 dot?
                                                this.gagocycle = 0;
                                                this.wiy++;
                                            }
                                            
                                        }
                                            }
                                        }
                            }
                        this.gagocycle++;
                        
                                switch(this.gagocycle){
                                    case 2:

                                    if(this.windowing){
                                        const wix = ((this.curx-(this.memory.PPUreadByte(0xFF4B)-7))>>3)&0x1F;
                                        
                                        if(LCDC&64) this.temptileid = this.memory.PPUreadByte(0x9C00+((this.wiy>>3)<<5)+wix); 
                                        else this.temptileid = this.memory.PPUreadByte(0x9800+((this.wiy>>3)<<5)+wix);  
                                    }else{
                                        const aby = (this.getly() + this.memory.PPUreadByte(0xFF42))&0xFF;
                                        
                                        const abx = ((this.curx>>3) + ((this.memory.PPUreadByte(0xFF43)+8)>>3))&0x1F;
                                        
                                        
                                        if(LCDC&8) this.temptileid = this.memory.PPUreadByte(0x9C00+((aby>>3)<<5)+abx); 
                                        else this.temptileid = this.memory.PPUreadByte(0x9800+((aby>>3)<<5)+abx); 
                                        
                         
                                        
                                    }

                                    break;

                                    case 4: // get low
                                        if(LCDC&16) this.tmpaddress = 0x8000+this.temptileid*16;
                                        else{
                                            const pos = ((128 + this.temptileid)&255)-128;
                                            this.tmpaddress = 0x9000+pos*16;

                                        }
                                        
                                        let realaddress = this.tmpaddress;
                                        if(this.windowing) realaddress += (this.wiy&7)*2;
                                        else realaddress += ((this.getly() + this.memory.PPUreadByte(0xFF42))&7)*2;
                                        
                                        const tmptmpdata = this.memory.PPUreadByte(realaddress);
                                        
                                        for(let i=0;i<8;i++){
                                            this.size8arrayfor1line8dots[i] = (tmptmpdata >> (7-i))&1;
                                        }
                                        this.tmpaddress = realaddress+1;
                                        
                                    break;

                                    case 6: // get high
                                        const tmptmpdata2 = this.memory.PPUreadByte(this.tmpaddress);
                                        
                                        for(let i=0;i<8;i++){
                                            this.size8arrayfor1line8dots[i] = this.size8arrayfor1line8dots[i] | (((tmptmpdata2 >> (7-i))&1)<<1);
                                        }
                                    break;
                                        //case 8 sleep 
                                    case 10: // push 
                                        if(this.pixelbuffer.size<=8){
                                                for(let i=0;i<8;i++){
                                                    //if(this.size8arrayfor1line8dots[i]) console.log(this.size8arrayfor1line8dots[i]);
                                                    this.pixelbuffer.dataz[this.pixelbuffer.tail] = this.size8arrayfor1line8dots[i];
                                                   
                                                    this.pixelbuffer.tail++;
                                                    this.pixelbuffer.size++;
                                                    if(this.pixelbuffer.tail===16) this.pixelbuffer.tail = 0;
                                                }
                                            this.gagocycle = 0;
                                        }else{
                                            this.gagocycle--;
                                        }


                                    break; // if fail, decrement gagocycle by 1 to keep trying push
                                    // if success gago is 0

                                }

                           // pop pixels here increment curx after
                           //ignore SCXWP pixels
                           //IF SCXWP IGNORE OBJECT AND POP BG/WIN ONLY 
                           if(this.pixelbuffer.size>0){
                                //console.log(this.pixelbuffer.head);
                                let finpix = 0;
                                let rawpix = this.pixelbuffer.dataz[this.pixelbuffer.head];
                                if(LCDC&1){ // if show bg
                                    
                                    //if(rawpix)console.log(rawpix);
                                    finpix = (this.memory.PPUreadByte(0xFF47)&(3<<rawpix))>>rawpix;
                                    
                                }
                                
                                if(this.SCXWP>0){
                                    this.SCXWP--;
                                }else{ // use object
                                    if(this.objectbuffer.size>0){
                                        let objpix = this.objectbuffer.dataz[this.objectbuffer.head];
                                        if(objpix&3){
                                            let cpal = this.memory.PPUreadByte(0xFF48+((objpix&16)>>4)); // Not swearing!
                                            let truepix = (cpal & (3 << (objpix&3))) >> (objpix&3);
                                            
                                            if(objpix&128==0) finpix = truepix;
                                            else if(rawpix==0) finpix = truepix;
                                        }
                                        

                                        this.objectbuffer.size--;
                                        this.objectbuffer.head++;
                                        if(this.objectbuffer.head==16) this.objectbuffer.head = 0;
                                    }
                                }
                                this.pixelbuffer.size--;
                                this.pixelbuffer.head++;
                                if(this.pixelbuffer.head==16) this.pixelbuffer.head = 0;
                                this.dotstorage[this.getly()*160+this.curx] = finpix; 
                                
                                this.curx++;
                           }     
                        

                        }else{ // add penalty and move onto next oamptr
                            const objectsprite = this.oamarray[this.oampointer];
                            this.oampointer++;
                            const objecty = this.getly() - ((objectsprite >> 24) - 16);
                            let penaltyz = 6;
                            let temptileoams = ((this.curx + this.memory.PPUreadByte(0xFF43)))>>3;
                            if(this.windowing) temptileoams = ((this.curx-(this.memory.PPUreadByte(0xFF4B)-7))>>3);
                            if(this.lasttileforoam!= temptileoams){
                                penaltyz += 7 - this.SCXWP;
                                if(7-this.SCXWP<0) penaltyz = 6;

                            }
                            
                            this.lasttileforoam = temptileoams;
                            this.m3p = penaltyz;
                            const objectx = ((objectsprite & 0x00FF0000) >> 16)-8;
                            const objectidx = (objectsprite & 0x0000FF00) >> 8;
                            const objectflag = objectsprite & 0xFF;
                            if(objectflag&64) objecty = 15 - objecty;
                            const tileaddress = 0x8000 + objectidx*128;
                            const datdata = tileaddress + objecty*2; // if 8x16, still works because it magic yea
                            let bytez1 = this.memory.PPUreadByte(datdata);
                            let bytez2 = this.memory.PPUreadByte(datdata+1);
                            if(objectflag&32){
                                let res1 = 0;
                                let res2 = 0;
                                for(let i=7;i>=0;i--){
                                    res1 = res1 | ((bytez1&1)<<i);
                                    bytez1 = bytez1 >> 1;
                                }
                                for(let i=7;i>=0;i--){
                                    res2 = res2 | ((bytez2&1)<<i);
                                    bytez2 = bytez2 >> 1;
                                }
                                bytez1 = res1;
                                bytez2 = res2;
                            }
                            
                            for(let i=0;i<8;i++){
                                let saveint = 0;
                                saveint = (bytez1 >> (8-i))&1;
                                saveint = saveint | ((bytez2 >> (8-i))&1 <<1);
                                saveint = saveint | (objectflag&0xF0);//priority bit 7 and palette bit 4
                                if(objectx+i>=this.curx){
                                    let pospos = (this.objectbuffer.head + i)&0xF; // div 16
                                    if(this.objectbuffer.size>i){
                                        if(this.objectbuffer.dataz[pospos]&0x03===0){ //trans
                                            this.objectbuffer.dataz[this.objectbuffer.tail] = saveint;
                                            this.objectbuffer.tail++;
                                            this.objectbuffer.size++;
                                            if(this.objectbuffer.tail===16) this.objectbuffer.tail = 0;        
                                        }
                                    }else{
                                        this.objectbuffer.dataz[this.objectbuffer.tail] = saveint;
                                        this.objectbuffer.tail++;
                                        this.objectbuffer.size++;
                                        if(this.objectbuffer.tail===16) this.objectbuffer.tail = 0;                                         
                                    }

                                }
                                
                            }
                            
                        }
                        

                        

                    }
                }
                }else{
                       
                        this.mode = 0;

                }
            }else{
                
                this.turnedoff = true;
                this.mode = 2;
                this.extracycle = 0;
                this.memory.PPUwriteByte(0xFF44,0);
                
                this.showscreen();
                
            }
            if(this.extracycle===456){
                
                this.incremently();
                this.extracycle = 0;
                if(this.getly()===144){
                    this.wiy = -1;
                    this.showscreen();
                    this.mode = 1;
                    this.wytrigger = false;
                    this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|1);
                }else if(this.getly()===0) this.mode = 2;
                this.curx = 0;
                this.m3p = 0;
                this.gagocycle = 0;
                this.lasttileforoam = -1;      
                this.objectbuffer.head = 0;
                this.objectbuffer.tail = 0;
                this.objectbuffer.size = 0;
                this.pixelbuffer.head = 0;
                this.pixelbuffer.tail = 0; 
                this.pixelbuffer.size = 0; 
                this.windowing = false;
                
                
            }
            let STATs = this.memory.PPUreadByte(0xFF41);
            if(this.memory.PPUreadByte(0xFF45)===this.getly()){
                STATs = STATs | 4;
            }else{
                STATs = STATs & 0xFB;
            }
            STATs = (STATs & 0xFC) | this.mode;
            this.memory.PPUwriteByte(0xFF41,STATs);
            const newstatz = (((STATs&0x40)&&(STATs&0x4))||((STATs&0x20)&&this.mode===2)||((STATs&0x10)&&this.mode===1)||((STATs&0x08)&&this.mode===0));
            if(!this.STATsaver&&newstatz) this.memory.PPUwriteByte(0xFF0F,this.memory.PPUreadByte(0xFF0F)|2);

            
            this.STATsaver = newstatz;
            
        }else if(LCDC&0x80){
            this.turnedoff = false;
        }
        

    }    

}