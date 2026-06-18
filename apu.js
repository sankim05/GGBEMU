export class GABEAPU{
    constructor(memory){
        this.memory = memory;
        this.sampleBuffer = [];
        this.Nodez = null;
        this.audioContext = null;
        this.innercycle = 0; // div-apu
        this.APUturnedOff = true;
        this.ChannelOn = new Uint8Array(4);
        this.ChannelDAC = new Uint8Array(4);
        this.ChannelVolume = new Uint8Array(4);
        this.ChannelEnvelopeDirection = new Uint8Array(4);
        this.ChannelEnvelopeTick = new Uint8Array(4);
        this.ChannelLengthTimer = new Uint16Array(4); //has to include 0~256
        this.C1iterationTick = 0;
        this.C1ShadowReg = 0;
        this.C1SavedPace = 0;
        this.C1SweepEnabledFlag = 0;
        this.C1DutyCycle = 0;
        this.Lvolume = 0;
        this.Rvolume = 0;

        this.ChannelActualVolume = new Uint8Array(5); // 0 = master 1~4 channels
       
        
        this.setupSliders();

    }

    setupSliders(){
        document.querySelectorAll(".vcBox").forEach((stuff,idx)=>{
            const slider = stuff.querySelector(".vcSlider");
            const textz = stuff.querySelector(".vcNumber");
            
            slider.addEventListener("input", (obj) =>{
                
                this.ChannelActualVolume[idx] = parseInt(obj.target.value,10);
                textz.textContent = this.ChannelActualVolume[idx];
            });
            

        });
        
    }

    reset(){
        this.sampleBuffer = [];
        this.innercycle = 0;
        this.APUturnedOff = true;
        this.C1iterationTick = 0;
        this.C1ShadowReg = 0;
        this.C1SweepEnabledFlag = 0;
        this.C1SavedPace = 0;
        this.C1DutyCycle = 0;
        this.Lvolume = 0;
        this.Rvolume = 0;        
        for(let i=0;i<4;i++){
            
            this.ChannelOn[i] = 0;
            this.ChannelVolume[i] = 0;
            this.ChannelDAC[i] = 0;
            this.ChannelEnvelopeDirection[i] = 0;
            this.ChannelEnvelopeTick[i] = 0;
            this.ChannelLengthTimer[i] = 0;
            
        }
    }


    updateAudioBuffer(){
        let Spanning = this.memory.PPUreadByte(0xFF25) // NR51 Sound panning c4L c3L ... c4R c3R ... bit order
        let Mastervolume = this.memory.PPUreadByte(0xFF24) //FF24 each 3 bit iz volume left -> right

    }

    updateAPUFromMemoryWrite(channel){
        if(channel==2){
            if(this.ChannelLengthTimer[channel]==256){
                this.ChannelOn[channel] = 0;
                this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^(1 << channel)));
            }

        }else{
            if(this.ChannelLengthTimer[channel]==64){
                this.ChannelOn[channel] = 0;
                this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^(1 << channel)));
            }


        }


    }

    updateChannelLengthFromMemoryWrite(channel,value){
        if(channel==0) this.C1DutyCycle = value >>> 6;
        if(channel!=2) value %= 64;
        this.ChannelLengthTimer[channel] = value;
        
    }

    updateC1Sweep(){

        if(this.C1SweepEnabledFlag==0){
            return;
        }

        this.C1iterationTick++;
        let getbyte = this.memory.PPUreadByte(0xFF10);
        let pace = (getbyte & 0x70)>>4;
        let sub = getbyte & 8;
        let step = getbyte & 7;
        if(this.C1SavedPace!=0){
            if(this.C1SavedPace==this.C1iterationTick){
                this.C1iterationTick = 0;

                if(sub)this.C1ShadowReg -= (this.C1ShadowReg >> step);
                else this.C1ShadowReg += (this.C1ShadowReg >> step);

                if(this.C1ShadowReg>0x7FF){
                    this.ChannelOn[0] = 0; //ch1
                    this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^1));
                    return;
                }


                this.C1ShadowReg = this.C1ShadowReg & 0x7FF;
                this.C1SavedPace = pace;
                this.memory.PPUwriteByte(0xFF13,this.C1ShadowReg&0xFF);
                this.memory.PPUwriteByte(0xFF14,(this.memory.PPUreadByte(0xFF14)&0xF8) | ((this.C1ShadowReg&0x700) >> 8));

                let newvalue = this.C1ShadowReg;
                if(sub)newvalue -= (this.C1ShadowReg >> step);
                else newvalue += (this.C1ShadowReg >> step);
                if(newvalue>0x7FF){
                    this.ChannelOn[0] = 0; //ch1
                    this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^1));
                }
            }else if(this.C1SavedPace>this.C1iterationTick) this.C1iterationTick = 0;

        }else this.C1iterationTick = 0;


        

    }

    APUcycle(){ // 512hz
        if(this.APUturnedOff){

        if(this.memory.PPUreadByte(0xFF26)&128){
            this.APUturnedOff = false;
        }    
        else return;
        } 


        this.innercycle++;
        if(this.innercycle==Number.MAX_SAFE_INTEGER) this.innercycle = 0;

        if(this.innercycle%2===0){ //length
            //dont forget to turn off when manually writing via memory
            for(let i=0xFF14;i<=0xFF23;i+=5){
                
                if(this.memory.PPUreadByte(i)&64){
                    if(i==0xFF1E){
                        const curchannel = 2; //CH3
                        if(this.ChannelLengthTimer[curchannel]<256) this.ChannelLengthTimer[curchannel]++;
                        else{
                            this.ChannelOn[curchannel] = 0;
                            this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^(1 << curchannel)));

                        }

                    }
                    else{
                        const curchannel = (i-0xFF14)/5; //CH1~4 actual value = 0 1 3

                        if(this.ChannelLengthTimer[curchannel]<64) this.ChannelLengthTimer[curchannel]++;
                        else{
                            this.ChannelOn[curchannel] = 0;
                            this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^(1 << curchannel)));

                        }
                    }
                    
                }

            }


        }
        if(this.innercycle%4===0){ //CH1 Freq Sweep
            //if individual step !=0 during trigger(write) do it immediately
            this.updateC1Sweep();

        }
        if(this.innercycle%8===0){ //envelop

            // setup initial volume when writing to memory
            // same for DAC
            const c1num = this.memory.PPUreadByte(0xFF10);
            if(this.ChannelOn[0]){
                if(this.ChannelDAC[0]){
                    if(this.ChannelEnvelopeTick[0]){
                        if((this.innercycle/8)%this.ChannelEnvelopeTick[0]===0){
                            if(c1num&0x08){
                                if(this.ChannelVolume[0]<16) this.ChannelVolume[0]++;
                            }else{
                                if(this.ChannelVolume[0]!==0) this.ChannelVolume[0]--;
                            }

                        }

                    

                    }


                }
            }

        }
        
        
    }



}