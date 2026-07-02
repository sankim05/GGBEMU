let pulsewaveform = [[1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,0],[0,1,1,1,1,0,0,0],[1,0,0,0,0,0,0,1]];

export class GABEAPU{
    constructor(memory){
        this.memory = memory;

        this.Nodez = null;
        this.audioContext = null;
        this.innercycle = 0; // div-apu
        this.innerfastcycle = 0;
        this.APUturnedOff = true;
        this.ChannelOn = new Uint8Array(4);
        this.ChannelDAC = new Uint8Array(4);
        this.ChannelVolume = new Uint8Array(4);
        this.ChannelFrequency = new Uint16Array(4);
        this.ChannelCycle = new Uint32Array(3);
        this.ChannelEnvelopeDirection = new Uint8Array(4);
        this.ChannelEnvelopeTick = new Uint8Array(4);
        this.ChannelLengthTimer = new Uint16Array(4); //has to include 0~256
        this.C1iterationTick = 0;
        this.C1ShadowReg = 0;
        this.C1SavedPace = 0;
        this.C1SweepEnabledFlag = 0;
        this.C1DutyCycle = 0;
        this.C1DutyStep = 0; // 0~7 div by 8
        this.C2DutyCycle = 0;
        this.C2DutyStep = 0;
        this.C3Index = 1;
        this.ch3vol = 0.0;
        this._LFSR = 0;
        this.LFSRwidth = 0;
        this.ExportBufferL = new Float32Array(4096);
        this.ExportBufferR = new Float32Array(4096);

        this.BufferPointer = 0;
   
        this.hpfCapacitorL = 0;
        this.hpfCapacitorR = 0;        

        this.ChannelActualVolume = new Uint8Array(5).fill(100); // 0 = master 1~4 channels range 0~100
       
        
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
    
        this.innercycle = 0;
        this.innerfastcycle = 0;
        this.APUturnedOff = true;
        this.C1iterationTick = 0;
        this.C1ShadowReg = 0;
        this.C1SweepEnabledFlag = 0;
        this.C1SavedPace = 0;
        this.C1DutyCycle = 0;
        this.C1DutyStep = 0;
        this.C2DutyCycle = 0;
        this.C2DutyStep = 0;
        this.C3Index = 1;
        this.ch3vol = 0.0;
        this._LFSR = 0;
        this.LFSRwidth = 0;
        this.BufferPointer = 0;        
        for(let i=0;i<4;i++){
            
            this.ChannelOn[i] = 0;
            this.ChannelVolume[i] = 0;
            this.ChannelDAC[i] = 0;
            this.ChannelEnvelopeDirection[i] = 0;
            this.ChannelEnvelopeTick[i] = 0;
            this.ChannelLengthTimer[i] = 0;
            this.ChannelCycle[i] = 0;
            this.setFrequency(i);
            
        }
    }

    setFrequency(channel){
        switch(channel){
            case 1:
                this.ChannelFrequency[0] = ((this.memory.PPUreadByte(0xFF14)&0x07) << 8) | this.memory.PPUreadByte(0xFF13);
            break;
            case 2:
                this.ChannelFrequency[1] = ((this.memory.PPUreadByte(0xFF19)&0x07) << 8) | this.memory.PPUreadByte(0xFF18);
            break;
            case 3:
                this.ChannelFrequency[2] = ((this.memory.PPUreadByte(0xFF1E)&0x07) << 8) | this.memory.PPUreadByte(0xFF1D);
            break;
            case 4:
                let c4readbyte = this.memory.PPUreadByte(0xFF22);
                let divider = (c4readbyte&7) << 1;
                if(!divider) divider = 1;
                let shift = c4readbyte >>> 4;
                this.ChannelFrequency[3] = 1048576 / (262144/(divider*(1<<shift)));

                this.LFSRwidth = (c4readbyte&8)>>>3;
            break;            
        }

    }

    updateAudioBuffer(){ // export all data and reset pointer
        if(!this.Nodez||this.BufferPointer === 0){
            return;
        }

        this.Nodez.port.postMessage({left: this.ExportBufferL.slice(0, this.BufferPointer), right: this.ExportBufferR.slice(0, this.BufferPointer)});
        this.BufferPointer = 0;
    }
       

    fillAudioBuffer(){ //1 data
        if(this.BufferPointer>=4096){
            return;
        }
        if(this.APUturnedOff){
            this.hpfCapacitorL += (0 - this.hpfCapacitorL) * 0.01;
            this.hpfCapacitorR += (0 - this.hpfCapacitorR) * 0.01; 
            this.ExportBufferL[this.BufferPointer] = 0-this.hpfCapacitorL;
            this.ExportBufferR[this.BufferPointer] = 0-this.hpfCapacitorR;
            return;
        }


        let Spanning = this.memory.PPUreadByte(0xFF25) // NR51 Sound panning c4L c3L ... c4R c3R ... bit order
        let Mastervolume = this.memory.PPUreadByte(0xFF24) //FF24 each 3 bit iz volume left -> right


        //c1
        let C1Actual = 0;

        if(this.ChannelDAC[0]&&this.ChannelOn[0]){
            C1Actual = pulsewaveform[this.C1DutyCycle][this.C1DutyStep];
            C1Actual = (C1Actual*this.ChannelVolume[0])/15;
            C1Actual = (C1Actual*this.ChannelActualVolume[1])/100; // this is from html slider            
        }
     
        
        let C2Actual = 0;
        if(this.ChannelDAC[1]&&this.ChannelOn[1]){
            C2Actual = pulsewaveform[this.C2DutyCycle][this.C2DutyStep];
            C2Actual = (C2Actual*this.ChannelVolume[1])/15;
            C2Actual = (C2Actual*this.ChannelActualVolume[2])/100; // this is from html slider            
        }


        let C3Actual = 0;
        if(this.ChannelDAC[2]&&this.ChannelOn[2]){
            let thebyte = this.memory.PPUreadByte(0xFF30 + (this.C3Index>>>1));
            if(this.C3Index%2){
                C3Actual = thebyte&0x0F;
            }else{
                C3Actual = (thebyte&0xF0) >> 4;
            }
            ;
            C3Actual/=15;
            C3Actual *= this.ch3vol;
            
            C3Actual = (C3Actual*this.ChannelActualVolume[3])/100; // this is from html slider            
        }        
        
        let C4Actual = 0;
        if(this.ChannelDAC[3]&&this.ChannelOn[3]){
            C4Actual = this._LFSR&1;
            C4Actual = (C4Actual*this.ChannelVolume[3])/15;
            C4Actual = (C4Actual*this.ChannelActualVolume[4])/100; // this is from html slider            
        }

        //apply panning and mastervolume here
        let ActualDataL = 0;
        let ActualDataR = 0;

        ActualDataL += (C1Actual*((Spanning&16)>>>4));
        ActualDataL += (C2Actual*((Spanning&32)>>>5));
        ActualDataL += (C3Actual*((Spanning&64)>>>6));
        ActualDataL += (C4Actual*((Spanning&128)>>>7));
        ActualDataR += (C1Actual*(Spanning&1));
        ActualDataR += (C2Actual*((Spanning&2)>>>1));
        ActualDataR += (C3Actual*((Spanning&4)>>>2));
        ActualDataR += (C4Actual*((Spanning&8)>>>3));
        ActualDataL *= ((((Mastervolume&0b01110000)>>>4)+1)/8)
        ActualDataR *= (((Mastervolume&7)+1)/8)

        ActualDataL = (ActualDataL * this.ChannelActualVolume[0])/400;
        ActualDataR = (ActualDataR * this.ChannelActualVolume[0])/400;
        this.hpfCapacitorL += (ActualDataL - this.hpfCapacitorL) * 0.01;
        this.hpfCapacitorR += (ActualDataR - this.hpfCapacitorR) * 0.01;
        let centeredL = ActualDataL - this.hpfCapacitorL;
        let centeredR = ActualDataR - this.hpfCapacitorR;
        this.ExportBufferL[this.BufferPointer] = centeredL*2;
        this.ExportBufferR[this.BufferPointer] = centeredR*2;

        this.BufferPointer++;
        
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
        if(channel==1) this.C2DutyCycle = value >>> 6;
        if(channel!=2) value %= 64;
        this.ChannelLengthTimer[channel] = value;
        
    }

    updateC1Sweep(){

        if(this.C1SweepEnabledFlag==0){
            return;
        }

        this.C1iterationTick++;
        let getbyte = this.memory.PPUreadByte(0xFF10);
        let pace = (getbyte & 0x70)>>>4;
        let sub = getbyte & 8;
        let step = getbyte & 7;
        if(this.C1SavedPace!=0){
            if(this.C1SavedPace==this.C1iterationTick){
                this.C1iterationTick = 0;

                if(sub)this.C1ShadowReg -= (this.C1ShadowReg >>> step);
                else this.C1ShadowReg += (this.C1ShadowReg >>> step);

                if(this.C1ShadowReg>0x7FF){
                    this.ChannelOn[0] = 0; //ch1
                    this.memory.PPUwriteByte(0xFF26,this.memory.PPUreadByte(0xFF26)&(0xFF^1));
                    return;
                }


                this.C1ShadowReg = this.C1ShadowReg & 0x7FF;
                this.C1SavedPace = pace;
                this.memory.PPUwriteByte(0xFF13,this.C1ShadowReg&0xFF);
                this.memory.PPUwriteByte(0xFF14,(this.memory.PPUreadByte(0xFF14)&0xF8) | ((this.C1ShadowReg&0x700) >>> 8));

                let newvalue = this.C1ShadowReg;
                if(sub)newvalue -= (this.C1ShadowReg >>> step);
                else newvalue += (this.C1ShadowReg >>> step);
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
            this.C1DutyStep = 0;
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
            const c1num = this.memory.PPUreadByte(0xFF12);
            if(this.ChannelOn[0]){
                if(this.ChannelDAC[0]){
                    if(this.ChannelEnvelopeTick[0]){
                        if((this.innercycle/8)%this.ChannelEnvelopeTick[0]===0){
                            if(c1num&0x08){
                                if(this.ChannelVolume[0]<15) this.ChannelVolume[0]++;
                            }else{
                                if(this.ChannelVolume[0]!==0) this.ChannelVolume[0]--;
                            }

                        }

                    

                    }


                }
            }
            const c2num = this.memory.PPUreadByte(0xFF17);
            if(this.ChannelOn[1]){
                if(this.ChannelDAC[1]){
                    if(this.ChannelEnvelopeTick[1]){
                        if((this.innercycle/8)%this.ChannelEnvelopeTick[1]===0){
                            if(c2num&0x08){
                                if(this.ChannelVolume[1]<15) this.ChannelVolume[1]++;
                            }else{
                                if(this.ChannelVolume[1]!==0) this.ChannelVolume[1]--;
                            }

                        }

                    

                    }


                }
            }
            const c4num = this.memory.PPUreadByte(0xFF21);
            if(this.ChannelOn[3]){
                if(this.ChannelDAC[3]){
                    if(this.ChannelEnvelopeTick[3]){
                        if((this.innercycle/8)%this.ChannelEnvelopeTick[3]===0){
                            if(c4num&0x08){
                                if(this.ChannelVolume[3]<15) this.ChannelVolume[3]++;
                            }else{
                                if(this.ChannelVolume[3]!==0) this.ChannelVolume[3]--;
                            }

                        }

                    

                    }


                }
            }            
        }
        
        
    }

    APUPeriodCycle(){ // 2Mhz normally
        if(this.memory.PPUreadByte(0xFF26)&128){ //apu on
            this.innerfastcycle++;
            if(this.innerfastcycle==Number.MAX_SAFE_INTEGER) this.innerfastcycle = 0;

            if(this.innerfastcycle%2){

                if(this.ChannelOn[0]){
                   if(this.ChannelDAC[0]){
                    this.ChannelCycle[0]--;
                    if(this.ChannelCycle[0]===0||this.ChannelCycle[0]>2048){
                        this.ChannelCycle[0] = 2048-this.ChannelFrequency[0];
                        
                        this.C1DutyStep = (this.C1DutyStep+1)%8;
                    }

                    }
                }    
                if(this.ChannelOn[1]){
                   if(this.ChannelDAC[1]){
                    this.ChannelCycle[1]--;
                    if(this.ChannelCycle[1]===0||this.ChannelCycle[1]>2048){
                        this.ChannelCycle[1] = 2048-this.ChannelFrequency[1];
                        
                        this.C2DutyStep = (this.C2DutyStep+1)%8;
                    }

                    }
                }  
                if(this.ChannelOn[3]){
                   if(this.ChannelDAC[3]){

                        if(this.innerfastcycle%this.ChannelFrequency[3]<2){
                            let res = !((this._LFSR&1)^((this._LFSR&2)>>>1));
                            this._LFSR = (this._LFSR&0x7FFF)|(res<<15);
                            if(this.LFSRwidth){
                                this._LFSR = (this._LFSR&0xFF7F)|(res<<7);
                            }
                            this._LFSR = this._LFSR >>> 1;

                        }
                   }
                }  
            }
            if(this.ChannelOn[2]){
                if(this.ChannelDAC[2]){
                    this.ChannelCycle[2]--;
                    if(this.ChannelCycle[2]===0||this.ChannelCycle[2]>2048){
                        this.ChannelCycle[2] = 2048-this.ChannelFrequency[2];
                        
                        this.C3Index = (this.C3Index+1)%32;
                    }                    
                }
            }



        }

    }


}